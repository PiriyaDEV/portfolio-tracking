import { Asset } from "@/app/lib/interface";
import { TiChartPieOutline as ChartIcon } from "react-icons/ti";

type NoItemProps = {
  onAddClick: () => void;
  isEditOpen: boolean;
  editAssets: Asset[];
  setEditAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  addNewAsset: () => void;
  removeAsset: (index: number) => void;
  saveAssets: () => Promise<void>;
  setIsEditOpen: React.Dispatch<React.SetStateAction<boolean>>;
  EditModal: React.FC<any>;
};

export const NoItem: React.FC<NoItemProps> = ({
  onAddClick,
  isEditOpen,
  editAssets,
  setEditAssets,
  addNewAsset,
  removeAsset,
  saveAssets,
  setIsEditOpen,
  EditModal,
}) => {
  return (
    <div className="mt-[81px] mb-[172px]">
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-gray-400 text-center">
          <ChartIcon className="text-6xl mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-white mb-2">ยังไม่มีข้อมูล</h2>
          <p className="text-sm mb-6">เริ่มต้นโดยการเพิ่มสินทรัพย์ของคุณ</p>
          <button
            className="bg-accent-yellow text-black px-6 py-3 rounded font-semibold hover:bg-yellow-500 transition-colors"
            onClick={onAddClick}
          >
            เพิ่มสินทรัพย์แรก
          </button>
        </div>
      </div>

      {isEditOpen && (
        <EditModal
          editAssets={editAssets}
          setEditAssets={setEditAssets}
          addNewAsset={addNewAsset}
          removeAsset={removeAsset}
          saveAssets={saveAssets}
          setIsEditOpen={setIsEditOpen}
        />
      )}
    </div>
  );
};
