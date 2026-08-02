import { PictureInPictureIcon } from "@phosphor-icons/react";
import { FooterButton } from "../../utils/components/footer";

type PictureInPictureButtonProps = {
  isActive: boolean;
  onClick: () => void;
};

export const PictureInPictureButton = ({ isActive, onClick }: PictureInPictureButtonProps) => {
  const label = isActive ? "Close Picture-in-Picture" : "Open Picture-in-Picture";

  return (
    <FooterButton aria-label={label} title={label} onClick={onClick}>
      <PictureInPictureIcon className="size-4" weight={isActive ? "fill" : "regular"} />
    </FooterButton>
  );
};
