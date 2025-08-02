import { HistoryItem } from "@/pages/Interview";
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

interface ConversationPanelProps {
  history: HistoryItem[];
  isWaitingForResponse: boolean;
}

const ConversationPanel = ({ history, isWaitingForResponse }: ConversationPanelProps) => {
  const lastAiMessage = history.filter(item => item.role === 'model').pop();
  const bubbleRef = useRef(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  const messageText = lastAiMessage?.parts?.[0]?.text;

  useGSAP(() => {
    if (messageText && textRef.current) {
      // FIX: The original logic `messageText.split(' ')` discarded newline
      // characters, merging all paragraphs. This new logic preserves them.
      
      textRef.current.innerHTML = ''; // Clear previous text

      // Split text by whitespace, but keep the whitespace characters (spaces, newlines)
      // in the resulting array. e.g., "Hi\nthere" becomes ["Hi", "\n", "there"]
      const parts = messageText.split(/(\s+)/);

      parts.forEach(part => {
        // If the part is a word (i.e., contains non-whitespace characters)
        if (part.trim().length > 0) {
          const span = document.createElement('span');
          span.textContent = part;
          span.style.display = 'inline-block';
          span.style.opacity = '0';
          span.style.transform = 'translateY(10px)';
          textRef.current.appendChild(span);
        } else {
          // Otherwise, it's a whitespace part. Append it as a text node
          // to preserve the original formatting (spaces, newlines, etc.).
          textRef.current.appendChild(document.createTextNode(part));
        }
      });

      // Animate only the <span> elements (the words), not the whitespace text nodes.
      gsap.to(textRef.current.querySelectorAll('span'), {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        ease: 'power3.out',
        delay: 0.2,
      });
    }
  }, { scope: bubbleRef, dependencies: [messageText] });

  return (
    <div className="flex flex-col h-full items-center pt-8">
      <div className="flex-1 flex items-start justify-center p-6 w-full mt-4">
        {isWaitingForResponse ? (
          <div className="relative max-w-2xl w-full">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg min-h-[120px] flex items-center justify-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-2.5 w-2.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2.5 w-2.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2.5 w-2.5 bg-slate-400 rounded-full animate-bounce"></div>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[15px] border-b-white dark:border-b-slate-800"></div>
          </div>
        ) : messageText ? (
          <div 
            key={messageText}
            ref={bubbleRef} 
            className="relative max-w-2xl w-full"
          >
            <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl p-6 text-left text-xl shadow-lg min-h-[120px]">
              {/* This 'p' tag with 'whitespace-pre-wrap' is essential for rendering the newline characters correctly. */}
              <p ref={textRef} className="whitespace-pre-wrap"></p>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[15px] border-b-white dark:border-b-slate-800"></div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ConversationPanel;