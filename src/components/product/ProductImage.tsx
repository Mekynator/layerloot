import React from "react";

export interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fit?: "contain" | "cover";
}

/**
 * ProductImage - A shared image component for product/commerce images.
 * - Defaults to object-contain for safer fit, but allows cover for banners/hero.
 * - Handles aspect ratio, centering, and background for consistent rendering.
 * - Use for product cards, thumbnails, cart, saved items, account, etc.
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = "",
  fit = "contain",
  ...props
}) => {
  return (
    <img
      src={src}
      alt={alt}
      className={`h-full w-full ${fit === "contain" ? "object-contain bg-white" : "object-cover"} ${className}`}
      loading="lazy"
      draggable={false}
      {...props}
    />
  );
};
