import { CONTACT_EMAIL } from "@/constants/contact";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { getCareTeamMembersForPet } from "@/services/careTeamMembers";
import { addEmail, getWhitelistedEmails } from "@/services/petEmailList";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NewMessageModalProps {
  visible: boolean;
  onClose: () => void;
  onSend?: (message: {
    to: string;
    subject: string;
    message: string;
    petId: string;
  }) => Promise<void>;
  initialRecipientEmail?: string;
  /** Pre-fill body when opening from Milo journal / deep link */
  initialMessageBody?: string;
  /** Pre-select pet when opening from Milo journal */
  initialPetId?: string;
}

interface WhitelistedContact {
  id: string;
  name: string;
  email: string;
  business?: string;
}

function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase() || "?";
}

export const NewMessageModal: React.FC<NewMessageModalProps> = ({
  visible,
  onClose,
  onSend,
  initialRecipientEmail,
  initialMessageBody,
  initialPetId,
}) => {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const { pets } = usePets();
  const { top, bottom } = useSafeAreaInsets();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(
    pets.length > 0 ? pets[0].id : null
  );
  const [toContact, setToContact] = useState<WhitelistedContact | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showPetDropdown, setShowPetDropdown] = useState(false);
  const [sending, setSending] = useState(false);
  const lastProcessedEmailRef = useRef<string | null>(null);

  useEffect(() => {
    if (visible && initialPetId && pets.some((p) => p.id === initialPetId)) {
      setSelectedPetId(initialPetId);
    }
  }, [visible, initialPetId, pets]);

  useEffect(() => {
    if (visible && initialMessageBody) {
      setMessage(initialMessageBody);
    }
  }, [visible, initialMessageBody]);

  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId) || null,
    [pets, selectedPetId]
  );

  // Fetch care team members for selected pet
  const { data: careTeamMembers = [] } = useQuery({
    queryKey: ["care_team_members", selectedPetId],
    queryFn: () => getCareTeamMembersForPet(selectedPetId!),
    enabled: !!selectedPetId,
  });

  // Fetch safe senders (whitelisted emails) for selected pet
  const { data: safeSenders = [] } = useQuery({
    queryKey: ["safe_senders", selectedPetId],
    queryFn: () => getWhitelistedEmails(selectedPetId!),
    enabled: !!selectedPetId,
  });

  // Build list of whitelisted contacts with care team first, then safe senders, then support email
  const contacts = useMemo(() => {
    const contacts: WhitelistedContact[] = [];
    const seenEmails = new Set<string>();

    // 1. Add care team members first
    careTeamMembers.forEach((member) => {
      if (member.email) {
        const normalizedEmail = member.email.toLowerCase().trim();
        if (!seenEmails.has(normalizedEmail)) {
          seenEmails.add(normalizedEmail);
          contacts.push({
            id: member.id,
            name: member.vet_name,
            email: member.email,
            business: member.clinic_name,
          });
        }
      }
    });

    // 2. Add safe senders (excluding those already in care team)
    safeSenders.forEach((sender) => {
      const normalizedEmail = sender.email_id.toLowerCase().trim();
      if (!seenEmails.has(normalizedEmail)) {
        seenEmails.add(normalizedEmail);
        contacts.push({
          id: `safe_sender_${sender.id}`,
          name: sender.email_id.split("@")[0], // Use email prefix as name if no name available
          email: sender.email_id,
          business: undefined,
        });
      }
    });

    // 3. Always add support email as a special contact (even if not whitelisted)
    const supportEmail = CONTACT_EMAIL.toLowerCase();
    if (!seenEmails.has(supportEmail)) {
      contacts.push({
        id: "support_email",
        name: "PawBuck Support",
        email: CONTACT_EMAIL,
        business: "Support Team",
      });
    }

    return contacts;
  }, [careTeamMembers, safeSenders]);

  // Pre-fill recipient when initialRecipientEmail is provided and modal opens
  useEffect(() => {
    if (!visible) {
      lastProcessedEmailRef.current = null;
      return;
    }

    if (initialRecipientEmail) {
      const normalizedEmail = initialRecipientEmail.toLowerCase();
      
      // Skip if we've already processed this email for this modal opening
      if (lastProcessedEmailRef.current === normalizedEmail) {
        return;
      }
      
      // Check if it's the support email first (always available, doesn't need contacts)
      if (normalizedEmail === CONTACT_EMAIL.toLowerCase()) {
        setToContact({
          id: "support_email",
          name: "PawBuck Support",
          email: CONTACT_EMAIL,
          business: "Support Team",
        });
        lastProcessedEmailRef.current = normalizedEmail;
        return;
      }
      
      // Otherwise, find matching contact in the list (wait for contacts to be available)
      if (contacts.length > 0) {
        const matchingContact = contacts.find(
          (contact) => contact.email.toLowerCase() === normalizedEmail
        );
        if (matchingContact) {
          // Always set the contact if it matches, even if one is already selected
          // This allows the email param to override any previously selected contact
          setToContact(matchingContact);
          lastProcessedEmailRef.current = normalizedEmail;
        }
      }
    } else {
      // Reset contact if modal opens without an initial email
      setToContact(null);
      lastProcessedEmailRef.current = null;
    }
  }, [visible, initialRecipientEmail, contacts]);

  const handleSend = async () => {
    if (!toContact) {
      Alert.alert("Required Field", "Please select a recipient");
      return;
    }
    if (!subject.trim()) {
      Alert.alert("Required Field", "Please enter a subject");
      return;
    }
    if (!message.trim()) {
      Alert.alert("Required Field", "Please enter a message");
      return;
    }
    if (!selectedPetId) {
      Alert.alert("Error", "Please select a pet");
      return;
    }

    setSending(true);
    try {
      // Auto-whitelist support email if it's the recipient and not already whitelisted
      if (toContact.email.toLowerCase() === CONTACT_EMAIL.toLowerCase()) {
        try {
          await addEmail(selectedPetId, CONTACT_EMAIL, false);
          console.log("Auto-whitelisted support email for pet:", selectedPetId);
        } catch (error: any) {
          // Ignore if already whitelisted or other non-critical errors
          if (!error.message?.includes("already in your safe senders")) {
            console.log("Could not auto-whitelist support email:", error);
          }
        }
      }

      if (onSend) {
        await onSend({
          to: toContact.email,
          subject: subject.trim(),
          message: message.trim(),
          petId: selectedPetId,
        });
      }
      // Reset form
      setToContact(null);
      setSubject("");
      setMessage("");
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to send message. Please try again.");
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setToContact(null);
    setSubject("");
    setMessage("");
    setShowToDropdown(false);
    setShowPetDropdown(false);
    onClose();
  };

  const handleManageContacts = () => {
    handleClose();
    router.push("/(home)/profile");
  };

  /** Match Subject / Message fields and recipient dropdown surface. */
  const isDark = mode === "dark";
  const inputBg = isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const renderContactDropdown = (
    contacts: WhitelistedContact[],
    selectedContact: WhitelistedContact | null,
    onSelect: (contact: WhitelistedContact | null) => void,
    showDropdown: boolean,
    onToggleDropdown: () => void
  ) => {
    // Separate care team members, safe senders, and support email
    const careTeamContacts = contacts.filter(
      (c) => !c.id.startsWith("safe_sender_") && c.id !== "support_email"
    );
    const safeSenderContacts = contacts.filter(
      (c) => c.id.startsWith("safe_sender_")
    );
    const supportContact = contacts.find((c) => c.id === "support_email");
    
    const availableCareTeam = careTeamContacts.filter(
      (c) => c.id !== toContact?.id
    );
    
    const availableSafeSenders = safeSenderContacts.filter(
      (c) => c.id !== toContact?.id
    );

    const hasAvailableContacts =
      availableCareTeam.length > 0 ||
      availableSafeSenders.length > 0 ||
      (supportContact && supportContact.id !== toContact?.id);

    const subtext = isDark ? "rgba(255,255,255,0.68)" : "rgba(0,0,0,0.55)";
    const caption = isDark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.45)";
    const avatarBg = isDark ? "rgba(95,196,192,0.18)" : "rgba(95,196,192,0.14)";
    const SectionHeader = ({ title }: { title: string }) => (
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.8,
            color: caption,
            textTransform: "uppercase",
          }}
        >
          {title}
        </Text>
      </View>
    );

    const ContactRow = ({
      contact,
      onPick,
      icon,
    }: {
      contact: WhitelistedContact;
      onPick: () => void;
      icon?: keyof typeof Ionicons.glyphMap;
    }) => (
      <TouchableOpacity
        onPress={onPick}
        activeOpacity={0.65}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: inputBg,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: avatarBg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          {icon ? (
            <Ionicons name={icon} size={22} color={theme.primary} />
          ) : (
            <Text style={{ fontSize: 15, fontWeight: "700", color: theme.primary }}>
              {contactInitials(contact.name)}
            </Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 16, fontWeight: "600", color: theme.foreground, letterSpacing: -0.2 }}
          >
            {contact.name}
          </Text>
          {!!contact.business && (
            <Text numberOfLines={1} style={{ fontSize: 13, color: subtext, marginTop: 3 }}>
              {contact.business}
            </Text>
          )}
          <Text numberOfLines={1} style={{ fontSize: 13, color: subtext, marginTop: contact.business ? 2 : 4 }}>
            {contact.email}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={caption} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    );

    const InsetDivider = () => (
      <View
        style={{
          height: StyleSheet.hairlineWidth,
          backgroundColor: inputBorder,
          marginLeft: 74,
          marginRight: 16,
        }}
      />
    );

    return (
      <View style={{ position: "relative" }}>
        <TouchableOpacity
          onPress={() => {
            setShowPetDropdown(false);
            onToggleDropdown();
          }}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: inputBg,
            borderWidth: 1,
            borderColor: inputBorder,
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}
        >
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              flex: 1,
              fontSize: 15,
              color: selectedContact ? theme.foreground : theme.secondary,
            }}
          >
            {selectedContact
              ? `${selectedContact.name} · ${selectedContact.email}`
              : "Choose a recipient…"}
          </Text>
          <Ionicons
            name={showDropdown ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.secondary}
          />
        </TouchableOpacity>

        {showDropdown && (
          <View
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 6,
              borderRadius: 16,
              backgroundColor: inputBg,
              borderWidth: 1,
              borderColor: inputBorder,
              maxHeight: 320,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.22,
              shadowRadius: 16,
              elevation: Platform.OS === "android" ? 18 : 10,
              zIndex: 100,
            }}
          >
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={{ backgroundColor: inputBg }}
              contentContainerStyle={{ paddingBottom: 18 }}
            >
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 0.6,
                    color: caption,
                    textTransform: "uppercase",
                  }}
                >
                  Choose recipient
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  onSelect(null);
                  onToggleDropdown();
                }}
                activeOpacity={0.65}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor: inputBg,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <Ionicons name="close-circle-outline" size={22} color={subtext} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: theme.foreground }}>Clear selection</Text>
                  <Text style={{ fontSize: 13, color: subtext, marginTop: 4 }}>No recipient for this message</Text>
                </View>
              </TouchableOpacity>

              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: inputBorder, marginVertical: 4 }} />

              {/* Care Team Section */}
              {availableCareTeam.length > 0 && (
                <>
                  <SectionHeader title="Care team" />
                  {availableCareTeam.map((contact, idx) => (
                    <View key={contact.id}>
                      <ContactRow
                        contact={contact}
                        onPick={() => {
                          onSelect(contact);
                          onToggleDropdown();
                        }}
                      />
                      {idx < availableCareTeam.length - 1 ? <InsetDivider /> : null}
                    </View>
                  ))}
                </>
              )}

              {/* Safe Senders Section */}
              {availableSafeSenders.length > 0 && (
                <>
                  {availableCareTeam.length > 0 ? (
                    <View
                      style={{
                        height: 8,
                        backgroundColor: isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.04)",
                        marginTop: 6,
                        marginBottom: 2,
                      }}
                    />
                  ) : null}
                  <SectionHeader title="Safe senders" />
                  {availableSafeSenders.map((contact, idx) => (
                    <View key={contact.id}>
                      <ContactRow
                        contact={contact}
                        onPick={() => {
                          onSelect(contact);
                          onToggleDropdown();
                        }}
                      />
                      {idx < availableSafeSenders.length - 1 ? <InsetDivider /> : null}
                    </View>
                  ))}
                </>
              )}

              {/* Support */}
              {supportContact && supportContact.id !== toContact?.id && (
                <>
                  {(availableCareTeam.length > 0 || availableSafeSenders.length > 0) && (
                    <View
                      style={{
                        height: 8,
                        backgroundColor: isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.04)",
                        marginTop: 6,
                        marginBottom: 2,
                      }}
                    />
                  )}
                  <SectionHeader title="Support" />
                  <ContactRow
                    contact={supportContact}
                    onPick={() => {
                      onSelect(supportContact);
                      onToggleDropdown();
                    }}
                    icon="headset-outline"
                  />
                </>
              )}

              {!hasAvailableContacts && (
                <View style={{ paddingVertical: 28, paddingHorizontal: 20, alignItems: "center" }}>
                  <Ionicons name="people-outline" size={36} color={caption} style={{ marginBottom: 10 }} />
                  <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground, textAlign: "center" }}>
                    No contacts yet
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: subtext,
                      textAlign: "center",
                      marginTop: 6,
                      lineHeight: 20,
                      maxWidth: 260,
                    }}
                  >
                    Add care team members or safe senders from Settings, then try again.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const canSend = !!toContact && !!subject.trim() && !!message.trim() && !sending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: theme.background,
          paddingTop: Platform.OS === "android" ? top : 0,
        }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={sending}
              activeOpacity={0.7}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
              }}
            >
              <Ionicons name="arrow-back" size={20} color={theme.foreground} />
            </TouchableOpacity>
            <Text
              style={{
                flex: 1,
                fontSize: 20,
                fontWeight: "700",
                color: theme.foreground,
                textAlign: "center",
                marginRight: 40,
              }}
            >
              New Message
            </Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20, overflow: "visible" }}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Pet Selector */}
          {pets.length > 1 && (
            <View
            style={{
              marginBottom: 20,
              zIndex: showPetDropdown ? 80 : 1,
              elevation: showPetDropdown && Platform.OS === "android" ? 12 : 0,
            }}
          >
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground, marginBottom: 8 }}>
                Pet
              </Text>
              <View style={{ position: "relative" }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowPetDropdown(!showPetDropdown);
                    setShowToDropdown(false);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: inputBg,
                    borderWidth: 1,
                    borderColor: inputBorder,
                    borderRadius: 16,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                  }}
                >
                  <Text style={{ fontSize: 15, color: theme.foreground }}>
                    {selectedPet?.name || "Select a pet"}
                  </Text>
                  <Ionicons
                    name={showPetDropdown ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={theme.secondary}
                  />
                </TouchableOpacity>

                {showPetDropdown && (
                  <View
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      backgroundColor: inputBg,
                      borderWidth: 1,
                      borderColor: inputBorder,
                      borderRadius: 12,
                      maxHeight: 200,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 12,
                      elevation: Platform.OS === "android" ? 16 : 8,
                      zIndex: 90,
                    }}
                  >
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                      style={{ backgroundColor: inputBg }}
                    >
                      {pets.map((pet) => (
                        <TouchableOpacity
                          key={pet.id}
                          onPress={() => {
                            setSelectedPetId(pet.id);
                            setShowPetDropdown(false);
                            setToContact(null);
                          }}
                          activeOpacity={0.7}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: inputBorder,
                            backgroundColor:
                              pet.id === selectedPetId ? `${theme.primary}22` : inputBg,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: pet.id === selectedPetId ? "600" : "400",
                              color: pet.id === selectedPetId ? theme.primary : theme.foreground,
                            }}
                          >
                            {pet.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* To Field — high z-index + opaque menu so list is not obscured by Subject/Message below */}
          <View
            style={{
              marginBottom: 20,
              zIndex: showToDropdown ? 100 : 3,
              elevation: showToDropdown && Platform.OS === "android" ? 20 : 0,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground, marginBottom: 8 }}>
              To
            </Text>
            {renderContactDropdown(
              contacts,
              toContact,
              setToContact,
              showToDropdown,
              () => setShowToDropdown(!showToDropdown)
            )}
          </View>

          {/* Subject Field */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground, marginBottom: 8 }}>
              Subject
            </Text>
            <TextInput
              style={{
                backgroundColor: inputBg,
                color: theme.foreground,
                borderWidth: 1,
                borderColor: inputBorder,
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 16,
                fontSize: 15,
              }}
              value={subject}
              onChangeText={setSubject}
              placeholder="Enter subject"
              placeholderTextColor={theme.secondary}
              editable={!sending}
            />
          </View>

          {/* Message Field */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground, marginBottom: 8 }}>
              Message
            </Text>
            <TextInput
              style={{
                backgroundColor: inputBg,
                color: theme.foreground,
                borderWidth: 1,
                borderColor: inputBorder,
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 16,
                fontSize: 15,
                minHeight: 140,
                textAlignVertical: "top",
              }}
              value={message}
              onChangeText={setMessage}
              placeholder="Write your message..."
              placeholderTextColor={theme.secondary}
              multiline
              numberOfLines={6}
              editable={!sending}
            />
          </View>

          {/* Upload File */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground, marginBottom: 8 }}>
              Upload File
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: inputBg,
                borderWidth: 1,
                borderColor: inputBorder,
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <Ionicons name="attach" size={18} color={theme.secondary} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 15, fontWeight: "500", color: theme.foreground, marginRight: 8 }}>
                Choose File
              </Text>
              <Text style={{ fontSize: 14, color: theme.secondary }}>
                No file chosen
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? bottom + 8 : 16,
          }}
        >
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={sending}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 16,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: theme.foreground }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.7}
              style={{
                flex: 1,
                flexDirection: "row",
                paddingVertical: 16,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: canSend ? theme.primary : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
              }}
            >
              {sending ? (
                <ActivityIndicator size="small" color={canSend ? "#fff" : theme.secondary} />
              ) : (
                <>
                  <Ionicons
                    name="paper-plane-outline"
                    size={18}
                    color={canSend ? "#FFFFFF" : theme.secondary}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: canSend ? "#FFFFFF" : theme.secondary,
                    }}
                  >
                    Send
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
