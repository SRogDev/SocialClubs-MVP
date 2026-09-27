import type { Post } from "@/types/post";

import PollForm from "./poll-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

function PollFormModal({
  showContentModal,
  setShowContentModal,
  post,
  action,
}: {
  showContentModal: boolean;
  setShowContentModal: (value: boolean) => void;
  post?: Post;
  action: "add" | "edit";
}) {
  const options = post?.poll?.options.map((p) => {
    return { value: p.text };
  });
  return (
    <Dialog open={showContentModal} onOpenChange={setShowContentModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Encuensta</DialogTitle>
        </DialogHeader>

        <PollForm
          question={post?.poll?.question}
          options={options}
          action={action}
          id={post?.id}
          closeDialog={() => setShowContentModal(false)}
        ></PollForm>

      </DialogContent>
    </Dialog>
  );
}

export default PollFormModal;
