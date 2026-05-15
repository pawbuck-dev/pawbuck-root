import assert from "node:assert/strict";
import test from "node:test";
import {
  formatBugListForReview,
  formatBugObservationForReview,
  pageToBugObservation,
} from "./bugObservation.js";

const samplePage = {
  object: "page",
  id: "abc-123",
  url: "https://www.notion.so/sample-bug-abc123",
  created_time: "2026-05-01T10:00:00.000Z",
  last_edited_time: "2026-05-02T12:00:00.000Z",
  properties: {
    Name: {
      type: "title",
      title: [{ plain_text: "Booking wizard crashes on submit" }],
    },
    Status: {
      type: "status",
      status: { name: "Open" },
    },
    Severity: {
      type: "select",
      select: { name: "High" },
    },
    Description: {
      type: "rich_text",
      rich_text: [{ plain_text: "App closes when confirming appointment." }],
    },
    "Steps to reproduce": {
      type: "rich_text",
      rich_text: [{ plain_text: "Open booking flow and tap confirm." }],
    },
    Platform: {
      type: "select",
      select: { name: "iOS" },
    },
  },
} as const;

test("pageToBugObservation maps common Notion fields", () => {
  const bug = pageToBugObservation(samplePage);

  assert.equal(bug.title, "Booking wizard crashes on submit");
  assert.equal(bug.status, "Open");
  assert.equal(bug.severity, "High");
  assert.equal(bug.platform, "iOS");
  assert.match(bug.description ?? "", /confirming appointment/);
});

test("formatBugObservationForReview includes key sections", () => {
  const bug = pageToBugObservation(samplePage);
  const formatted = formatBugObservationForReview(bug);

  assert.match(formatted, /# Booking wizard crashes on submit/);
  assert.match(formatted, /## Description/);
  assert.match(formatted, /## Steps to reproduce/);
  assert.match(formatted, /https:\/\/www\.notion\.so\/sample-bug-abc123/);
});

test("formatBugListForReview handles empty results", () => {
  const formatted = formatBugListForReview([]);
  assert.match(formatted, /No bug observations matched/);
});
