import { FC } from "react";

interface CommonBtnProps {
  onClick: () => void;
  className?: string;
  text: string;
  disabled?: boolean;
  type?: "primary" | "secondary";
}

const CommonBtn: FC<CommonBtnProps> = ({
  onClick,
  className = "",
  text = "Click",
  disabled = false,
  type = "primary",
}) => {
  const baseStyles = "btn w-full px-5 max-w-xs font-bold text-md";
  const disabledStyles = "bg-[#c5c6c7] cursor-not-allowed text-white";

  const primaryStyles = "bg-accent-yellow text-[#1b1607] border-none";
  const secondaryStyles = "bg-black-lighter text-accent-yellow !border border-[1px] border-accent-yellow/40";

  const finalStyles = disabled
    ? disabledStyles
    : type === "secondary"
    ? secondaryStyles
    : primaryStyles;

  return (
    <button
      className={`${baseStyles} ${finalStyles} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
};

export default CommonBtn;
