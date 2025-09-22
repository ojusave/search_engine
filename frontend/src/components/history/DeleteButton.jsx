/**
 * Delete button component with confirmation
 */
import { useState } from 'react';
import { Trash2 } from 'lucide-react';

export default function DeleteButton({ onDelete, itemName = 'item' }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    onDelete();
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Confirm
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="p-2 text-red-600 hover:bg-red-50 rounded"
      title={`Delete ${itemName}`}
    >
      <Trash2 size={16} />
    </button>
  );
}
