import React from "react";
import "./badge.css";
import { cn } from "../lib/utils.jsx";

function Badge({ className = "", variant = "default", ...props }) {
  return <div className={cn("badge", `badge--${variant}`, className)} {...props} />;
}

export { Badge };