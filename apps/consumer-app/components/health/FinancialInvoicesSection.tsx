import { dashboardCareTeamCardChrome } from "@/constants/figmaHealthLayout";
import type { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { useMiloUpload } from "@/hooks/useMiloUpload";
import { usePetDocuments } from "@/hooks/usePetDocuments";
import type { Tables } from "@/database.types";
import { pickPdfFile } from "@/utils/filePicker";
import { pickImageFromLibrary } from "@/utils/imagePicker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  pet: Pet | undefined;
};

type ExtractedFacts = {
  title?: string;
  summary?: string;
  primaryDate?: string | null;
  keyFacts?: { label: string; value: string }[];
};

function parseExtracted(json: Tables<"pet_documents">["extracted_json"]): ExtractedFacts {
  if (json === null || typeof json !== "object") return {};
  const o = json as Record<string, unknown>;
  const keyFactsRaw = o.keyFacts;
  const keyFacts = Array.isArray(keyFactsRaw)
    ? keyFactsRaw
        .map((x) => {
          if (!x || typeof x !== "object") return null;
          const r = x as Record<string, unknown>;
          const label = typeof r.label === "string" ? r.label : "";
          const value = typeof r.value === "string" ? r.value : "";
          return { label, value };
        })
        .filter(Boolean) as { label: string; value: string }[]
    : [];

  return {
    title: typeof o.title === "string" ? o.title : undefined,
    summary: typeof o.summary === "string" ? o.summary : undefined,
    primaryDate: typeof o.primaryDate === "string" ? o.primaryDate : null,
    keyFacts,
  };
}

function firstCurrencyInText(text: string | undefined): number | null {
  if (!text) return null;
  const m = text.match(/\$[\d,]+(?:\.\d{1,2})?/);
  if (!m) return null;
  const n = Number.parseFloat(m[0].replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseRowTotal(ex: ExtractedFacts): number | null {
  const labels = /^(total|amount|balance|charges|subtotal|invoice total)$/i;
  for (const kf of ex.keyFacts ?? []) {
    if (labels.test(kf.label.trim())) {
      const v = firstCurrencyInText(kf.value);
      if (v != null) return v;
    }
  }
  const blob = `${ex.title ?? ""} ${ex.summary ?? ""}`;
  return firstCurrencyInText(blob);
}

function parseRowCovered(ex: ExtractedFacts): number | null {
  const labels = /insurance|covered|plan|paid by|reimbursed|adjustment/i;
  let sum = 0;
  let any = false;
  for (const kf of ex.keyFacts ?? []) {
    if (labels.test(kf.label)) {
      const v = firstCurrencyInText(kf.value);
      if (v != null) {
        sum += v;
        any = true;
      }
    }
  }
  return any ? sum : null;
}

function providerLine(ex: ExtractedFacts): string {
  const prov =
    ex.keyFacts?.find((k) =>
      /provider|clinic|vendor|location|practice|hospital|pharmacy/i.test(k.label)
    )?.value?.trim() ?? "";
  return prov;
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatShortDate(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.trim();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Prefer service/invoice date from extraction; fall back to upload time. */
function effectiveInvoiceDate(
  row: Tables<"pet_documents">,
  ex: ExtractedFacts
): Date | null {
  if (ex.primaryDate) {
    const d = new Date(ex.primaryDate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const dateLabels = /^(invoice date|service date|date of service|statement date)$/i;
  for (const kf of ex.keyFacts ?? []) {
    if (dateLabels.test(kf.label.trim())) {
      const d = new Date(kf.value.trim());
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  const u = new Date(row.created_at);
  return Number.isNaN(u.getTime()) ? null : u;
}

/** True when `d` is in the same calendar year as `now` and not after today (local). */
function isInCalendarYearToDate(d: Date, now: Date): boolean {
  const y = now.getFullYear();
  const start = new Date(y, 0, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return d >= start && d <= end;
}

function aggregateBilling(rows: Tables<"pet_documents">[]) {
  let total = 0;
  let covered = 0;
  let coveredKnown = false;
  for (const row of rows) {
    const ex = parseExtracted(row.extracted_json);
    const t = parseRowTotal(ex);
    if (t != null) total += t;
    const c = parseRowCovered(ex);
    if (c != null) {
      covered += c;
      coveredKnown = true;
    }
  }
  const pct =
    total > 0 && coveredKnown ? Math.min(100, Math.round((covered / total) * 100)) : 0;
  return { total, covered, coveredKnown, pct };
}

type BillingYearGroup = {
  /** Calendar year from invoice/service date, or `null` when no usable date. */
  year: number | null;
  rows: Tables<"pet_documents">[];
  totals: ReturnType<typeof aggregateBilling>;
};

/** Group billing rows by calendar year of the effective invoice date (newest years first). */
function buildBillingYearGroups(rows: Tables<"pet_documents">[]): BillingYearGroup[] {
  const buckets = new Map<number | "undated", Tables<"pet_documents">[]>();

  for (const row of rows) {
    const ex = parseExtracted(row.extracted_json);
    const d = effectiveInvoiceDate(row, ex);
    const key: number | "undated" = d ? d.getFullYear() : "undated";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(row);
  }

  const sortWithin = (list: Tables<"pet_documents">[]) => {
    list.sort((a, b) => {
      const exA = parseExtracted(a.extracted_json);
      const exB = parseExtracted(b.extracted_json);
      const da = effectiveInvoiceDate(a, exA)?.getTime() ?? 0;
      const db = effectiveInvoiceDate(b, exB)?.getTime() ?? 0;
      return db - da;
    });
  };

  for (const list of buckets.values()) sortWithin(list);

  const out: BillingYearGroup[] = [];
  const numericYears: number[] = [];
  for (const k of buckets.keys()) {
    if (k === "undated") continue;
    numericYears.push(k);
  }
  numericYears.sort((a, b) => b - a);
  for (const y of numericYears) {
    const list = buckets.get(y)!;
    out.push({ year: y, rows: list, totals: aggregateBilling(list) });
  }
  if (buckets.has("undated")) {
    const list = buckets.get("undated")!;
    out.push({ year: null, rows: list, totals: aggregateBilling(list) });
  }
  return out;
}

/**
 * Health hub — invoices & billing (`billing_invoice`). YTD = current calendar year through today;
 * list is grouped by **invoice year** so owners can compare annual spend for insurance decisions.
 */
export default function FinancialInvoicesSection({ pet }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const queryClient = useQueryClient();
  const { data: vaultDocs = [], isLoading: loadingVault } = usePetDocuments(pet?.id);
  const { uploadAndAnalyze, status: miloUploadStatus } = useMiloUpload();
  const [expanded, setExpanded] = useState(false);

  const billingDocs = useMemo(
    () =>
      vaultDocs
        .filter((d) => d.document_type === "billing_invoice")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [vaultDocs]
  );

  const calendarYear = new Date().getFullYear();

  const ytdRows = useMemo(() => {
    const evaluationTime = new Date();
    return billingDocs.filter((row) => {
      const ex = parseExtracted(row.extracted_json);
      const d = effectiveInvoiceDate(row, ex);
      if (!d) return false;
      return isInCalendarYearToDate(d, evaluationTime);
    });
  }, [billingDocs]);

  const ytdTotals = useMemo(() => aggregateBilling(ytdRows), [ytdRows]);
  const allTotals = useMemo(() => aggregateBilling(billingDocs), [billingDocs]);

  const billingYearGroups = useMemo(() => buildBillingYearGroups(billingDocs), [billingDocs]);

  const hasOutOfYearInvoices =
    billingDocs.length > 0 &&
    (ytdRows.length < billingDocs.length || (ytdTotals.total <= 0 && allTotals.total > 0));

  const statusLabel = useMemo(() => {
    if (billingDocs.length === 0) return "None";
    if (allTotals.total <= 0) return "Tracked";
    if (!allTotals.coveredKnown || allTotals.covered <= 0) return "Review";
    if (allTotals.covered >= allTotals.total * 0.99) return "Paid";
    return "Partial";
  }, [billingDocs.length, allTotals]);

  const surface = {
    ...dashboardCareTeamCardChrome(isDark),
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  };

  const summaryWell = {
    backgroundColor: isDark ? "rgba(45,212,191,0.12)" : "rgba(13,148,136,0.08)",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  };

  const invoiceRowWell = {
    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  };

  const handleAddDocument = () => {
    if (!pet?.id) {
      Alert.alert("Error", "No pet selected");
      return;
    }
    Alert.alert(
      "Add document",
      "Upload a photo or PDF of an invoice or receipt. Milo will classify it as billing when possible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Photo library",
          onPress: async () => {
            try {
              const img = await pickImageFromLibrary();
              if (!img) return;
              await uploadAndAnalyze(pet.id, pet.name, img);
              await queryClient.invalidateQueries({ queryKey: ["pet_documents", pet.id] });
              Alert.alert("Saved", "Document analyzed and saved.");
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Upload failed");
            }
          },
        },
        {
          text: "PDF",
          onPress: async () => {
            try {
              const pdf = await pickPdfFile();
              if (!pdf) return;
              await uploadAndAnalyze(pet.id, pet.name, pdf);
              await queryClient.invalidateQueries({ queryKey: ["pet_documents", pet.id] });
              Alert.alert("Saved", "Document analyzed and saved.");
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Upload failed");
            }
          },
        },
      ]
    );
  };

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  const successColor = isDark ? "#4ADE80" : "#15803D";
  const muted = theme.secondary;

  return (
    <View style={{ marginTop: 6, marginBottom: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 20 }}>
        <MaterialCommunityIcons name="bank-outline" size={18} color={theme.secondary} />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: theme.secondary,
            letterSpacing: 1.2,
          }}
        >
          FINANCIAL
        </Text>
      </View>

      <View style={surface}>
        {loadingVault ? (
          <ActivityIndicator style={{ marginBottom: 12 }} color={theme.primary} />
        ) : null}
        {miloUploadStatus === "uploading" || miloUploadStatus === "analyzing" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <ActivityIndicator color={theme.primary} />
            <Text style={{ fontSize: 13, color: theme.secondary }}>
              {miloUploadStatus === "uploading" ? "Uploading…" : "Analyzing with Milo…"}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={toggle}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? "rgba(56,189,248,0.2)" : "rgba(2,132,199,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="document-text-outline" size={22} color={isDark ? "#7DD3FC" : "#0369A1"} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>
                Invoices & Billing
              </Text>
              <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 4 }} numberOfLines={2}>
                {billingDocs.length > 0
                  ? `${billingDocs.length} invoice${billingDocs.length === 1 ? "" : "s"} on file`
                  : "Upload invoices or receipts to track spend and coverage"}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color:
                  statusLabel === "Paid" || statusLabel === "Tracked"
                    ? successColor
                    : statusLabel === "None"
                      ? muted
                      : theme.primary,
              }}
            >
              {statusLabel}
            </Text>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={theme.secondary} />
          </View>
        </TouchableOpacity>

        {expanded ? (
          <View>
            <View style={summaryWell}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: muted,
                  letterSpacing: 0.8,
                }}
              >
                {`YEAR-TO-DATE · ${calendarYear}`}
              </Text>
              <Text style={{ fontSize: 11, color: muted, marginTop: 4, lineHeight: 16 }}>
                Totals use the invoice or service date in Milo{"'"}s extraction (not upload date), for Jan
                1–today in {calendarYear}.
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}
              >
                <Text style={{ fontSize: 28, fontWeight: "800", color: theme.foreground }}>
                  {ytdTotals.total > 0 ? formatUsd(ytdTotals.total) : "—"}
                </Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: muted }}>
                    {ytdRows.length} in {calendarYear}
                  </Text>
                  {ytdTotals.coveredKnown && ytdTotals.total > 0 ? (
                    <Text style={{ fontSize: 13, fontWeight: "600", color: successColor, marginTop: 4 }}>
                      {formatUsd(ytdTotals.covered)} covered
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 12, color: muted, marginTop: 4, maxWidth: 150 }} numberOfLines={3}>
                      {ytdTotals.total > 0
                        ? "Add insurance line items in documents for coverage estimates"
                        : hasOutOfYearInvoices
                          ? `Nothing dated in ${calendarYear} yet — see all saved below`
                          : "Add line items in documents for coverage estimates"}
                    </Text>
                  )}
                </View>
              </View>

              {hasOutOfYearInvoices && allTotals.total > 0 && billingYearGroups.length <= 1 ? (
                <Text style={{ fontSize: 12, color: muted, marginTop: 10, lineHeight: 18 }}>
                  All saved billing: {formatUsd(allTotals.total)} · {billingDocs.length} invoice
                  {billingDocs.length === 1 ? "" : "s"}
                  {ytdRows.length === 0 ? " (from other years or undated in extraction)" : ""}
                </Text>
              ) : null}

              <Text style={{ fontSize: 11, color: muted, marginTop: 10, lineHeight: 16 }}>
                Compare totals by calendar year below to see trends and choose deductible or plan levels.
              </Text>

              {ytdTotals.total > 0 && ytdTotals.coveredKnown ? (
                <>
                  <View
                    style={{
                      height: 8,
                      borderRadius: 4,
                      marginTop: 14,
                      overflow: "hidden",
                      flexDirection: "row",
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                    }}
                  >
                    <View
                      style={{
                        flex: Math.max(0, ytdTotals.pct),
                        height: 8,
                        backgroundColor: theme.primary,
                      }}
                    />
                    <View
                      style={{
                        flex: Math.max(1, 100 - ytdTotals.pct),
                        height: 8,
                        backgroundColor: "transparent",
                      }}
                    />
                  </View>
                  <Text style={{ fontSize: 12, color: muted, marginTop: 8 }}>
                    {ytdTotals.pct}% covered by insurance ({calendarYear} YTD, from extracted fields)
                  </Text>
                </>
              ) : null}
            </View>

            {billingDocs.length > 0 ? (
              <View style={{ marginTop: 18 }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: muted,
                    letterSpacing: 0.8,
                    marginBottom: 10,
                  }}
                >
                  BY YEAR
                </Text>

                {billingYearGroups.map((group) => (
                  <View key={group.year ?? "undated"} style={{ marginBottom: 18 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                        paddingBottom: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                      }}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 17, fontWeight: "800", color: theme.foreground }}>
                          {group.year != null ? `${group.year}` : "Undated"}
                        </Text>
                        <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                          {group.year == null
                            ? "Upload or extraction missing a service date"
                            : group.year === calendarYear
                              ? "Jan 1 – today (invoice dates in this year)"
                              : "Full calendar year (invoice dates)"}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: theme.foreground }}>
                          {group.totals.total > 0 ? formatUsd(group.totals.total) : "—"}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: muted, marginTop: 2 }}>
                          {group.rows.length} invoice{group.rows.length === 1 ? "" : "s"}
                        </Text>
                        {group.totals.coveredKnown && group.totals.total > 0 ? (
                          <Text style={{ fontSize: 12, fontWeight: "600", color: successColor, marginTop: 4 }}>
                            {formatUsd(group.totals.covered)} covered · {group.totals.pct}%
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {group.totals.total > 0 && group.totals.coveredKnown ? (
                      <View
                        style={{
                          height: 6,
                          borderRadius: 3,
                          marginBottom: 12,
                          overflow: "hidden",
                          flexDirection: "row",
                          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                        }}
                      >
                        <View
                          style={{
                            flex: Math.max(0, group.totals.pct),
                            height: 6,
                            backgroundColor: theme.primary,
                          }}
                        />
                        <View
                          style={{
                            flex: Math.max(1, 100 - group.totals.pct),
                            height: 6,
                            backgroundColor: "transparent",
                          }}
                        />
                      </View>
                    ) : null}

                    {group.rows.map((row) => {
                      const ex = parseExtracted(row.extracted_json);
                      const title = ex.title?.trim() || "Invoice";
                      const dateLine = formatShortDate(ex.primaryDate ?? row.created_at);
                      const total = parseRowTotal(ex);
                      const prov = providerLine(ex);
                      const detail =
                        total != null
                          ? prov
                            ? `${formatUsd(total)} · ${prov}`
                            : formatUsd(total)
                          : ex.summary?.trim().slice(0, 80) || "Billing document";

                      return (
                        <View key={row.id} style={invoiceRowWell}>
                          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                            <Ionicons name="document-outline" size={20} color={muted} style={{ marginTop: 2 }} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={{ fontSize: 15, fontWeight: "700", color: theme.foreground }}
                                numberOfLines={2}
                              >
                                {title}
                              </Text>
                              <Text style={{ fontSize: 13, color: muted, marginTop: 4 }}>{dateLine}</Text>
                              <Text style={{ fontSize: 13, color: muted, marginTop: 6 }} numberOfLines={2}>
                                {detail}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            ) : (
              <Text
                style={{
                  fontSize: 13,
                  color: muted,
                  lineHeight: 20,
                  marginTop: 14,
                }}
              >
                No billing documents yet. Upload invoices or payment summaries and Milo will file them here when
                classified as billing.
              </Text>
            )}

            <TouchableOpacity onPress={handleAddDocument} activeOpacity={0.85} style={{ marginTop: 14, alignSelf: "flex-start" }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.primary }}>+ Add document</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}
