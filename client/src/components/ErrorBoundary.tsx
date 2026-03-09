import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

const MAX_AUTO_RETRIES = 3;

/**
 * ErrorBoundary that auto-recovers from DOM manipulation errors
 * caused by Google Translate and similar browser extensions.
 * After MAX_AUTO_RETRIES, it shows a manual reload button.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    const isTranslateError =
      error.name === "NotFoundError" &&
      (error.message.includes("removeChild") ||
        error.message.includes("insertBefore"));

    if (isTranslateError && this.state.retryCount < MAX_AUTO_RETRIES) {
      // Auto-recover: clear the error and let React re-render
      console.warn(
        `[ErrorBoundary] Auto-recovering from DOM manipulation error (attempt ${this.state.retryCount + 1}/${MAX_AUTO_RETRIES})`
      );
      setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          retryCount: prev.retryCount + 1,
        }));
      }, 100);
    }
  }

  render() {
    if (this.state.hasError) {
      const isTranslateError =
        this.state.error?.name === "NotFoundError" &&
        (this.state.error?.message.includes("removeChild") ||
          this.state.error?.message.includes("insertBefore"));

      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">Se produjo un error inesperado.</h2>

            {isTranslateError && (
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                Este error puede ser causado por la extensión de Google Translate
                u otra extensión del navegador que modifica el contenido de la
                página. Intenta desactivar la traducción automática para esta
                página.
              </p>
            )}

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.message}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Recargar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
