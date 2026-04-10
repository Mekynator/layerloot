import React from "react";
import { toast } from "sonner";

export default class EditorErrorBoundary extends React.Component<any, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error("Editor render error:", error, info);
    try { toast.error("A block failed to render — check the editor."); } catch (e) {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          <strong>Block failed to render</strong>
          <div className="text-sm">This block has invalid data. Edit or remove it to continue.</div>
        </div>
      );
    }
    return this.props.children;
  }
}
