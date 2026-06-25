import {
  DOMAIN_CATEGORY_DEFAULT_ICONS,
  getDomainCategoryIconTier,
  getNavigationIconTier,
  ICON_WELL_SIZES,
  type DomainCategoryId,
  type IconWellSize,
} from "@/constants/iconTierTokens";
import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { type ReactNode } from "react";
import { View } from "react-native";

type MaterialIconProp = {
  materialIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  ionIcon?: never;
};

type IonIconProp = {
  ionIcon: keyof typeof Ionicons.glyphMap;
  materialIcon?: never;
};

type BaseIconProps = MaterialIconProp | IonIconProp;

export type NavigationIconWellProps = BaseIconProps & {
  size?: IconWellSize;
  children?: ReactNode;
};

export type DomainCategoryIconWellProps = {
  category: DomainCategoryId;
  size?: IconWellSize;
} & Partial<BaseIconProps>;

function renderGlyph(
  props: Partial<BaseIconProps>,
  iconSize: number,
  color: string
): ReactNode {
  if (props.materialIcon) {
    return <MaterialCommunityIcons name={props.materialIcon} size={iconSize} color={color} />;
  }
  if (props.ionIcon) {
    return <Ionicons name={props.ionIcon} size={iconSize} color={color} />;
  }
  return null;
}

function IconWellFrame({
  size,
  wellBg,
  children,
}: {
  size: IconWellSize;
  wellBg: string;
  children: ReactNode;
}) {
  const { well } = ICON_WELL_SIZES[size];
  return (
    <View
      style={{
        width: well,
        height: well,
        borderRadius: well / 2,
        backgroundColor: wellBg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
}

/** Tier A — muted navigation icon well. */
export function NavigationIconWell({
  size = "md",
  materialIcon,
  ionIcon,
  children,
}: NavigationIconWellProps) {
  const { mode } = useTheme();
  const tier = getNavigationIconTier(mode === "dark");
  const { icon } = ICON_WELL_SIZES[size];

  return (
    <IconWellFrame size={size} wellBg={tier.wellBg}>
      {children ??
        (materialIcon
          ? renderGlyph({ materialIcon }, icon, tier.glyphColor)
          : ionIcon
            ? renderGlyph({ ionIcon }, icon, tier.glyphColor)
            : null)}
    </IconWellFrame>
  );
}

/** Tier B — domain category icon well with tinted fill + colored glyph. */
export function DomainCategoryIconWell({
  category,
  size = "md",
  materialIcon,
  ionIcon,
}: DomainCategoryIconWellProps) {
  const { mode } = useTheme();
  const tier = getDomainCategoryIconTier(category, mode === "dark");
  const { icon } = ICON_WELL_SIZES[size];
  const defaults = DOMAIN_CATEGORY_DEFAULT_ICONS[category];

  const glyphProps: Partial<BaseIconProps> =
    materialIcon != null
      ? { materialIcon }
      : ionIcon != null
        ? { ionIcon }
        : defaults.kind === "material"
          ? { materialIcon: defaults.name }
          : { ionIcon: defaults.name };

  return (
    <IconWellFrame size={size} wellBg={tier.wellBg}>
      {renderGlyph(glyphProps, icon, tier.glyphColor)}
    </IconWellFrame>
  );
}
