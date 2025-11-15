import React from "react";
import Item from "@/shared/pages/Item";
import { ItemObj } from "@/app/lib/interface";
import { Settings } from "../SettingPopup";

type ItemModalProps = {
  members: any[];
  setItemArr: React.Dispatch<React.SetStateAction<ItemObj[]>>;
  setItemModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingItem?: ItemObj;
  settings: Settings
};

const ItemModal: React.FC<ItemModalProps> = ({
  members,
  setItemArr,
  setItemModalOpen,
  editingItem,
  settings
}) => {
  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setItemModalOpen(false);
    }
  };

  return (
    <div className="modal modal-open !text-black" onClick={onBackdropClick}>
      <div className="modal-box">
        <Item
          members={members}
          settings={settings}
          setItemArr={setItemArr}
          setItemModalOpen={setItemModalOpen}
          editingItem={editingItem}
        />
      </div>
    </div>
  );
};

export default ItemModal;
