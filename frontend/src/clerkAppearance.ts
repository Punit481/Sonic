// Matches Clerk's sign-in, sign-up and account widgets to Sonic's dark theme.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#c8ff3d",
    colorTextOnPrimaryBackground: "#0a0a0d",
    colorBackground: "#131318",
    colorInputBackground: "#1b1b22",
    colorInputText: "#f4f4f5",
    colorText: "#f4f4f5",
    colorTextSecondary: "#9b9ba6",
    colorNeutral: "#f4f4f5",
    colorDanger: "#ff6161",
    borderRadius: "0.75rem",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    card: { border: "1px solid #26262f", boxShadow: "none" },
    footer: { background: "#131318" },
  },
};
