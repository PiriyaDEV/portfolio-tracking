import { FC } from "react";
import SplashScreen from "../SplashScreen";

interface CommonLoadingProps {
  isLoading?: boolean;
  isFullScreen?: boolean;
}

const CommonLoading: FC<CommonLoadingProps> = ({
  isLoading = true,
  isFullScreen = true,
}) => {
  if (!isLoading) return null;

  if (isFullScreen) {
    return <SplashScreen exiting={false} />;
  }

  return (
    <div className="w-full flex justify-center items-center py-8">
      <div className="w-12 h-12">
        <svg className="animate-spin w-full h-full" viewBox="0 0 50 50">
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="white"
            strokeOpacity="0.15"
            strokeWidth="4"
          />
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="80 200"
            strokeDashoffset="-10"
          />
        </svg>
      </div>
    </div>
  );
};

export default CommonLoading;
