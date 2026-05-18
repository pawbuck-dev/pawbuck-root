import { router } from "expo-router";
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: null });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, message: null });
    router.replace("/(home)/home");
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          PawBuck hit an unexpected error. You can try again or return to the home screen.
        </Text>
        {__DEV__ && this.state.message ? (
          <Text style={styles.devMessage}>{this.state.message}</Text>
        ) : null}
        <Pressable style={styles.primaryButton} onPress={this.handleRetry}>
          <Text style={styles.primaryLabel}>Try again</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={this.handleGoHome}>
          <Text style={styles.secondaryLabel}>Go to home</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#0f1419",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  devMessage: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 16,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#2dd4bf",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 200,
    alignItems: "center",
  },
  primaryLabel: {
    color: "#0f1419",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 200,
    alignItems: "center",
  },
  secondaryLabel: {
    color: "#2dd4bf",
    fontSize: 16,
    fontWeight: "500",
  },
});
