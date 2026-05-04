import { useEffect, useState } from "react";
import { getSignedProgressPhotoUrl } from "@/lib/progressPhotos";

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  pathOrUrl: string | null | undefined;
}

/**
 * <img> wrapper that resolves a `progress-photos` storage path (or legacy
 * public URL containing the bucket path) into a short-lived signed URL.
 */
const SignedProgressImg = ({ pathOrUrl, ...rest }: Props) => {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    (async () => {
      const signed = await getSignedProgressPhotoUrl(pathOrUrl);
      if (active) setSrc(signed ?? undefined);
    })();
    return () => { active = false; };
  }, [pathOrUrl]);

  return <img {...rest} src={src} />;
};

export default SignedProgressImg;