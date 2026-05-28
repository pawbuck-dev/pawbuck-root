import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

export type PawthonBadgeId =
  | "first_walk"
  | "streak_3"
  | "streak_7"
  | "mile_one"
  | "walks_10"
  | "morning"
  | "comeback"
  | "multi_pet"
  | "week_5mi"
  | "photo"
  | "goal_week"
  | "rank_top10";

export type PawthonBadgeDef = {
  id: PawthonBadgeId;
  name: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>["name"];
};

export const PAWTHON_BADGES: PawthonBadgeDef[] = [
  { id: "first_walk", name: "First steps", description: "Complete your first saved walk.", icon: "footsteps" },
  { id: "streak_3", name: "On a roll", description: "Reach a 3-day walking streak.", icon: "flame" },
  { id: "streak_7", name: "Week warrior", description: "Reach a 7-day walking streak.", icon: "calendar" },
  { id: "mile_one", name: "Mile club", description: "Walk at least one mile in a single session.", icon: "ribbon" },
  { id: "walks_10", name: "Explorer", description: "Complete 10 saved walks.", icon: "map" },
  { id: "morning", name: "Early bird", description: "Finish a walk before 9 AM.", icon: "sunny" },
  { id: "comeback", name: "Welcome back", description: "Walk again after 7+ days without a walk.", icon: "heart" },
  { id: "multi_pet", name: "Pack leader", description: "Walk two different pets in one week.", icon: "paw" },
  { id: "week_5mi", name: "Distance digger", description: "Walk 5+ miles total in one week.", icon: "trending-up" },
  { id: "photo", name: "Picture perfect", description: "Add a photo during a walk.", icon: "camera" },
  { id: "goal_week", name: "Goal getter", description: "Hit your daily goal 5 days in one week.", icon: "checkmark-circle" },
  { id: "rank_top10", name: "Top walker", description: "Finish in the top 10 on the weekly board.", icon: "trophy" },
];

export const PAWTHON_BADGE_BY_ID = Object.fromEntries(
  PAWTHON_BADGES.map((b) => [b.id, b])
) as Record<PawthonBadgeId, PawthonBadgeDef>;
