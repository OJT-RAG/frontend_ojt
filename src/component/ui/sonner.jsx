import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import "./sonner.css";

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "toast-class",
          description: "toast-description",
          actionButton: "toast-action-button",
          cancelButton: "toast-cancel-button",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
