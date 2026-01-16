import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { getCareTeamMembersForPet } from "@/services/careTeamMembers";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

interface NewMessageModalProps {
  visible: boolean;
  onClose: () => void;
  onSend?: (message: {
    to: string;
    cc?: string;
    bcc?: string;
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
  const { theme } = useTheme();
  const router = useRouter();
  const { pets } = usePets();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(
    pets.length > 0 ? pets[0].id : null
  );
  const [toContact, setToContact] = useState<WhitelistedContact | null>(null);
  const [ccContact, setCcContact] = useState<WhitelistedContact | null>(null);
  const [bccContact, setBccContact] = useState<WhitelistedContact | null>(null);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showCcDropdown, setShowCcDropdown] = useState(false);
  const [showBccDropdown, setShowBccDropdown] = useState(false);
  const [showPetDropdown, setShowPetDropdown] = useState(false);
  const [sending, setSending] = useState(false);

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

  // Build list of whitelisted contacts
  const contacts = useMemo(() => {
    const contacts: WhitelistedContact[] = [];

    // Add care team members if whitelisted
    careTeamMembers.forEach((member) => {
      if (member.email) {
        contacts.push({
          id: member.id,
          name: member.vet_name,
          email: member.email,
          business: member.clinic_name,
        });
      }
    });

    return contacts;
  }, [careTeamMembers]);

  // Pre-fill recipient when initialRecipientEmail is provided and modal opens
  useEffect(() => {
    if (visible && initialRecipientEmail && contacts.length > 0) {
      const matchingContact = contacts.find(
        (contact) =>
          contact.email.toLowerCase() === initialRecipientEmail.toLowerCase()
      );
      if (matchingContact) {
        // Always set the contact if it matches, even if one is already selected
        // This allows the email param to override any previously selected contact
        setToContact(matchingContact);
      }
    } else if (visible && !initialRecipientEmail) {
      // Reset contact if modal opens without an initial email
      setToContact(null);
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
      if (onSend) {
        await onSend({
          to: toContact.email,
          cc: ccContact?.email,
          bcc: bccContact?.email,
          subject: subject.trim(),
          message: message.trim(),
          petId: selectedPetId,
        });
      }
      // Reset form
      setToContact(null);
      setCcContact(null);
      setBccContact(null);
      setSubject("");
      setMessage("");
      setShowCcBcc(false);
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
    setCcContact(null);
    setBccContact(null);
    setSubject("");
    setMessage("");
    setShowCcBcc(false);
    setShowToDropdown(false);
    setShowCcDropdown(false);
    setShowBccDropdown(false);
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
    const availableContacts = contacts.filter(
      (c) =>
        c.id !== toContact?.id &&
        c.id !== ccContact?.id &&
        c.id !== bccContact?.id
    );

    return (
      <View style={{ position: "relative" }}>
        <TouchableOpacity
          onPress={() => {
            setShowPetDropdown(false);
            onToggleDropdown();
          }}
          className="flex-row items-center justify-between rounded-xl py-4 px-4"
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.primary,
          }}
          activeOpacity={0.7}
        >
          <Text
            className="flex-1 text-base"
            style={{
              color: selectedContact ? theme.foreground : theme.secondary,
            }}
          >
            {selectedContact
              ? `${selectedContact.name} <${selectedContact.email}>`
              : "Select a whitelisted contact"}
          </Text>
          <Ionicons
            name={showDropdown ? "chevron-up" : "chevron-down"}
            size={20}
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
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              maxHeight: 200,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
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
              {availableContacts.map((contact) => (
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
              {availableContacts.length === 0 && (
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ backgroundColor: theme.background }}
      >
        {/* Header */}
        <View
          className="px-6 pt-4 pb-4 border-b"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={handleClose} disabled={sending}>
              <Ionicons name="close" size={24} color={theme.foreground} />
            </TouchableOpacity>
            <Text
              className="text-lg font-semibold"
              style={{ color: theme.foreground }}
            >
              New Message
            </Text>
            <View style={{ width: 24 }} />
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6 pt-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner */}
          <View
            className="flex-row items-start p-4 rounded-xl mb-6"
            style={{
              backgroundColor: "#22C55E15",
              borderWidth: 1,
              borderColor: "#22C55E40",
            }}
          >
            <Ionicons
              name="information-circle"
              size={20}
              color="#22C55E"
              style={{ marginRight: 12, marginTop: 2 }}
            />
            <View className="flex-1">
              <Text
                className="text-sm"
                style={{ color: theme.foreground, lineHeight: 20 }}
              >
                You can only send messages to whitelisted contacts in your Care
                Team.{" "}
                <Text
                  onPress={handleManageContacts}
                  style={{ color: "#22C55E", fontWeight: "600" }}
                >
                  Manage in Profile → My Care Team
                </Text>
              </Text>
            </View>
          </View>

          {/* Pet Selector */}
          {pets.length > 1 && (
            <View className="mb-6" style={{ zIndex: showPetDropdown ? 60 : 1 }}>
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                Pet
              </Text>
              <View style={{ position: "relative" }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowPetDropdown(!showPetDropdown);
                    setShowToDropdown(false);
                    setShowCcDropdown(false);
                    setShowBccDropdown(false);
                  }}
                  className="flex-row items-center rounded-xl py-4 px-4"
                  style={{
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.primary,
                  }}
                  activeOpacity={0.7}
                >
                  <Text className="flex-1" style={{ color: theme.foreground }}>
                    {selectedPet?.name || "Select a pet"}
                  </Text>
                  <Ionicons
                    name={showPetDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
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
                      backgroundColor: theme.card,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      maxHeight: 200,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                      elevation: 5,
                      zIndex: 60,
                    }}
                  >
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      {pets.map((pet) => (
                        <TouchableOpacity
                          key={pet.id}
                          onPress={() => {
                            setSelectedPetId(pet.id);
                            setShowPetDropdown(false);
                            // Reset contact selection when pet changes
                            setToContact(null);
                            setCcContact(null);
                            setBccContact(null);
                          }}
                          className="py-3 px-4 border-b"
                          style={{
                            borderBottomColor: theme.border + "40",
                            backgroundColor:
                              pet.id === selectedPetId
                                ? theme.primary + "20"
                                : "transparent",
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            className="font-medium"
                            style={{
                              color:
                                pet.id === selectedPetId
                                  ? theme.primary
                                  : theme.foreground,
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
          <View className="mb-4" style={{ zIndex: showToDropdown ? 50 : 3 }}>
            <View className="flex-row items-center justify-between mb-2">
              <Text
                className="text-sm font-medium"
                style={{ color: theme.secondary }}
              >
                To *
              </Text>
              <TouchableOpacity
                onPress={() => setShowCcBcc(!showCcBcc)}
                className="flex-row items-center"
                activeOpacity={0.7}
              >
                <Text
                  className="text-sm font-medium mr-1"
                  style={{ color: theme.primary }}
                >
                  CC/BCC
                </Text>
                <Ionicons
                  name={showCcBcc ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.primary}
                />
              </TouchableOpacity>
            </View>
            {renderContactDropdown(
              contacts,
              toContact,
              setToContact,
              showToDropdown,
              () => {
                setShowToDropdown(!showToDropdown);
                setShowCcDropdown(false);
                setShowBccDropdown(false);
              }
            )}
          </View>

          {/* CC Field */}
          {showCcBcc && (
            <View className="mb-4" style={{ zIndex: showCcDropdown ? 50 : 2 }}>
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                CC
              </Text>
              {renderContactDropdown(
                contacts,
                ccContact,
                setCcContact,
                showCcDropdown,
                () => {
                  setShowCcDropdown(!showCcDropdown);
                  setShowToDropdown(false);
                  setShowBccDropdown(false);
                }
              )}
            </View>
          )}

          {/* BCC Field */}
          {showCcBcc && (
            <View className="mb-4" style={{ zIndex: showBccDropdown ? 50 : 1 }}>
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                BCC
              </Text>
              {renderContactDropdown(
                contacts,
                bccContact,
                setBccContact,
                showBccDropdown,
                () => {
                  setShowBccDropdown(!showBccDropdown);
                  setShowToDropdown(false);
                  setShowCcDropdown(false);
                }
              )}
            </View>
          )}

          {/* Subject Field */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Subject *
            </Text>
            <TextInput
              className="w-full rounded-xl py-4 px-4"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
                borderWidth: 1,
                borderColor: theme.primary,
                textAlignVertical: "center",
              }}
              value={subject}
              onChangeText={setSubject}
              placeholder="Enter subject"
              placeholderTextColor={theme.secondary}
              editable={!sending}
            />
          </View>

          {/* Message Field */}
          <View className="mb-6">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Message *
            </Text>
            <TextInput
              className="w-full rounded-xl py-4 px-4"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
                borderWidth: 1,
                borderColor: theme.primary,
                minHeight: 120,
              }}
              value={message}
              onChangeText={setMessage}
              placeholder="Write your message..."
              placeholderTextColor={theme.secondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!sending}
            />
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View
          className="px-6 py-4 border-t"
          style={{
            backgroundColor: theme.card,
            borderTopColor: theme.border,
          }}
        >
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleClose}
              disabled={sending}
              className="flex-1 rounded-xl py-4 items-center justify-center"
              style={{
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: theme.border,
              }}
              activeOpacity={0.7}
            >
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSend}
              disabled={
                sending || !toContact || !subject.trim() || !message.trim()
              }
              className="flex-1 rounded-xl py-4 items-center justify-center flex-row"
              style={{
                backgroundColor:
                  sending || !toContact || !subject.trim() || !message.trim()
                    ? theme.border
                    : theme.primary,
              }}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={20} color="#fff" />
                  <Text
                    className="text-base font-semibold ml-2"
                    style={{ color: "#fff" }}
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
