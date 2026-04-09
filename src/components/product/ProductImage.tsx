import React from "react";

export interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fit?: "contain" | "cover";
}

export const ProductImage = React.forwardRef<HTMLImageElement, ProductImageProps>(
  ({ src, alt, className = "", fit = "contain", ...props }, ref) => {
    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={`h-full w-full ${fit === "contain" ? "object-contain bg-white" : "object-cover"} ${className}`}
        loading="lazy"
        draggable={false}
        {...props}
      />
    );
  }
);

ProductImage.displayName = "ProductImage";
