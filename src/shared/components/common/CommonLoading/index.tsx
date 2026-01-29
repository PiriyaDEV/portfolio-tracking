import { FC } from "react";
import { PuffLoader } from "react-spinners";

interface CommonLoadingProps {
  isLoading?: boolean;
  isFullScreen?: boolean;
}

const CommonLoading: FC<CommonLoadingProps> = ({
  isLoading = true,
  isFullScreen = true,
}) => {
  if (!isLoading) return null;

  // Full screen overlay
  if (isFullScreen) {
    return (
      <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-[102]">
        <PuffLoader
          color="white"
          size={80}
          aria-label="Loading Spinner"
          data-testid="loader"
        />
      </div>
    );
  }

  // Inline / component-level loader
  return (
    <div className="w-full flex justify-center items-center py-2">
      <PuffLoader
        color="white"
        size={80}
        aria-label="Loading Spinner"
        data-testid="loader"
      />
    </div>
  );
};

export default CommonLoading;
