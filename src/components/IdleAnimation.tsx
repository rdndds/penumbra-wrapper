export const IdleAnimation: React.FC = () => {
  return (
    <div className="flex items-center gap-3 text-zinc-400">
      <span>Waiting for device</span>
      <span className="flex gap-1">
        <span className="animate-bounce [animation-delay:-0.3s]">.</span>
        <span className="animate-bounce [animation-delay:-0.15s]">.</span>
        <span className="animate-bounce">.</span>
      </span>
    </div>
  );
};
