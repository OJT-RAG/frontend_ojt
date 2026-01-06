import * as React from "react";
import { cn } from "../lib/utils.jsx";
import "./input.css";

const Input = React.forwardRef((props, ref) => {
  const { className, type, ...rest } = props;
  return (
    <input
      type={type}
      className={cn("input-class", className)}
      ref={ref}
      {...rest}
    />
  );
});

Input.displayName = "Input";

export { Input };
