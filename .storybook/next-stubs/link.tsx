import * as React from "react";

// Storybook (Vite builder) stub for next/link — renders a plain anchor.
type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string | { pathname?: string };
};

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, children, ...props }, ref) => (
    <a
      ref={ref}
      href={typeof href === "string" ? href : (href?.pathname ?? "#")}
      {...props}
    >
      {children}
    </a>
  ),
);
Link.displayName = "NextLinkStub";

export default Link;
