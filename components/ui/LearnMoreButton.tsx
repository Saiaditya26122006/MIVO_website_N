import { cn } from "@/lib/utils";

interface LearnMoreButtonProps {
  className?: string;
}

export function LearnMoreButton({ className }: LearnMoreButtonProps) {
  return (
    <button
      className={cn(
        "learn-more-btn relative inline-block cursor-pointer outline-none border-0 bg-transparent p-0 w-48 h-auto",
        className
      )}
    >
      <span className="learn-more-circle relative block m-0 w-12 h-12 bg-ink rounded-[1.625rem] transition-all duration-[450ms] ease-[cubic-bezier(0.65,0,0.076,1)]">
        <span className="learn-more-icon absolute top-0 bottom-0 my-auto bg-cream left-2.5 w-[1.125rem] h-0.5 transition-all duration-[450ms] ease-[cubic-bezier(0.65,0,0.076,1)]">
          <span className="absolute content-[''] -top-[0.29rem] right-0.5 w-2.5 h-2.5 border-t-2 border-r-2 border-cream rotate-45" />
        </span>
      </span>
      <span className="learn-more-text absolute top-0 left-0 right-0 bottom-0 py-3 ml-[1.85rem] text-ink font-bold leading-[1.6] text-center uppercase text-sm transition-all duration-[450ms] ease-[cubic-bezier(0.65,0,0.076,1)]">
        Learn More
      </span>
    </button>
  );
}
