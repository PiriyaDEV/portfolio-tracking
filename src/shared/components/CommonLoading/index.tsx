import { FC } from "react";
import { PuffLoader } from "react-spinners";

interface CommonLoadingProps {
  isLoading?: boolean;
}

const CommonLoading: FC<CommonLoadingProps> = ({ isLoading = true }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-[102]">
      <PuffLoader
        color="white"
        loading={isLoading}
        size={80}
        aria-label="Loading Spinner"
        data-testid="loader"
      />
    </div>
  );
};

export default CommonLoading;
