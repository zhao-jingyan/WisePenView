export interface UploadMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocalPress: () => void;
  onCloudPress: () => void;
}
