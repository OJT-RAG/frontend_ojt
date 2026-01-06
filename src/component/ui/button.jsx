import React from "react";
import { Slot } from "@radix-ui/react-slot";
import "./button.css";
import { cn } from "../lib/utils.jsx";

const buttonVariants = {
  default: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};


function Button({ className = "", variant = "default", size = "default", asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn("btn", `btn--${variant}`, `btn--${size}`, className)} {...props} />;
}

export { Button };