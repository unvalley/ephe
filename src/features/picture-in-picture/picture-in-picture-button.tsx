import { FooterButton } from "../../utils/components/footer";

type PictureInPictureButtonProps = {
  isActive: boolean;
  onClick: () => void;
};

export const PictureInPictureButton = ({ isActive, onClick }: PictureInPictureButtonProps) => {
  const label = isActive ? "Floating" : "Float";

  return (
    <FooterButton aria-pressed={isActive} title={label} onClick={onClick}>
      {label}
    </FooterButton>
  );
};
