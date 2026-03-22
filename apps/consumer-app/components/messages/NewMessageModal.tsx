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
}

interface WhitelistedContact {
  id: string;
  name: string;
  email: string;
  business?: string;
}

export const NewMessageModal: React.FC<NewMessageModalProps> = ({
  visible,
  onClose,
  onSend,
  initialRecipientEmail,
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
    router.push("/(home)/settings");
  };

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

    const isDk = mode === "dark";
    const inBg = isDk ? "rgba(255,255,255,0.04)" : "#FFFFFF";
    const inBdr = isDk ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

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
            backgroundColor: inBg,
            borderWidth: 1,
            borderColor: inBdr,
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              color: selectedContact ? theme.foreground : theme.secondary,
            }}
          >
            {selectedContact
              ? `${selectedContact.name} <${selectedContact.email}>`
              : "Select a whitelisted contact..."}
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
              marginTop: 4,
              borderRadius: 12,
              backgroundColor: inBg,
              borderWidth: 1,
              borderColor: inBdr,
              maxHeight: 200,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 5,
              zIndex: 50,
            }}
          >
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                onPress={() => {
                  onSelect(null);
                  onToggleDropdown();
                }}
                className="py-3 px-4 border-b"
                style={{ borderBottomColor: theme.border + "40" }}
                activeOpacity={0.7}
              >
                <Text style={{ color: theme.secondary }}>None</Text>
              </TouchableOpacity>
              
              {/* Care Team Section */}
              {availableCareTeam.length > 0 && (
                <>
                  <View className="px-4 py-2" style={{ backgroundColor: theme.background + "80" }}>
                    <Text
                      className="text-xs font-semibold uppercase"
                      style={{ color: theme.secondary }}
                    >
                      Care Team
                    </Text>
                  </View>
                  {availableCareTeam.map((contact) => (
                    <TouchableOpacity
                      key={contact.id}
                      onPress={() => {
                        onSelect(contact);
                        onToggleDropdown();
                      }}
                      className="py-3 px-4 border-b"
                      style={{ borderBottomColor: theme.border + "40" }}
                      activeOpacity={0.7}
                    >
                      <Text
                        className="font-medium"
                        style={{ color: theme.foreground }}
                      >
                        {contact.name}
                      </Text>
                      {contact.business && (
                        <Text
                          className="text-sm"
                          style={{ color: theme.secondary }}
                        >
                          {contact.business}
                        </Text>
                      )}
                      <Text className="text-sm" style={{ color: theme.secondary }}>
                        {contact.email}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              
              {/* Safe Senders Section */}
              {availableSafeSenders.length > 0 && (
                <>
                  {availableCareTeam.length > 0 && (
                    <View className="px-4 py-1" style={{ backgroundColor: theme.border + "20" }} />
                  )}
                  <View className="px-4 py-2" style={{ backgroundColor: theme.background + "80" }}>
                    <Text
                      className="text-xs font-semibold uppercase"
                      style={{ color: theme.secondary }}
                    >
                      Safe Senders
                    </Text>
                  </View>
                  {availableSafeSenders.map((contact) => (
                    <TouchableOpacity
                      key={contact.id}
                      onPress={() => {
                        onSelect(contact);
                        onToggleDropdown();
                      }}
                      className="py-3 px-4 border-b"
                      style={{ borderBottomColor: theme.border + "40" }}
                      activeOpacity={0.7}
                    >
                      <Text
                        className="font-medium"
                        style={{ color: theme.foreground }}
                      >
                        {contact.name}
                      </Text>
                      <Text className="text-sm" style={{ color: theme.secondary }}>
                        {contact.email}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Support Email Section */}
              {supportContact && supportContact.id !== toContact?.id && (
                <>
                  {(availableCareTeam.length > 0 || availableSafeSenders.length > 0) && (
                    <View className="px-4 py-1" style={{ backgroundColor: theme.border + "20" }} />
                  )}
                  <View className="px-4 py-2" style={{ backgroundColor: theme.background + "80" }}>
                    <Text
                      className="text-xs font-semibold uppercase"
                      style={{ color: theme.secondary }}
                    >
                      Support
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      onSelect(supportContact);
                      onToggleDropdown();
                    }}
                    className="py-3 px-4 border-b"
                    style={{ borderBottomColor: theme.border + "40" }}
                    activeOpacity={0.7}
                  >
                    <Text
                      className="font-medium"
                      style={{ color: theme.foreground }}
                    >
                      {supportContact.name}
                    </Text>
                    {supportContact.business && (
                      <Text
                        className="text-sm"
                        style={{ color: theme.secondary }}
                      >
                        {supportContact.business}
                      </Text>
                    )}
                    <Text className="text-sm" style={{ color: theme.secondary }}>
                      {supportContact.email}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              {!hasAvailableContacts && (
                <View className="py-4 px-4">
                  <Text
                    className="text-sm text-center"
                    style={{ color: theme.secondary }}
                  >
                    No available contacts
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const isDark = mode === "dark";
  const inputBg = isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
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
          style={{ flex: 1, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Pet Selector */}
          {pets.length > 1 && (
            <View style={{ marginBottom: 20, zIndex: showPetDropdown ? 60 : 1 }}>
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
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 5,
                      zIndex: 60,
                    }}
                  >
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
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
                            backgroundColor: pet.id === selectedPetId ? `${theme.primary}15` : "transparent",
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

          {/* To Field */}
          <View style={{ marginBottom: 20, zIndex: showToDropdown ? 50 : 3 }}>
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
