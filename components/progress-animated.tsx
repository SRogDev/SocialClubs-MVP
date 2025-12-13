import React, { useEffect, useState } from "react";
import { Progress } from "./ui/progress";

interface ProgressAnimatedProps {
  text: string;
  percentage: number;
  votes: number;
}
function ProgressAnimated({ text, votes, percentage }: ProgressAnimatedProps) {
  const [animate, setAnimate] = useState(1);
  useEffect(() => {
    setTimeout(() => {
      setAnimate(percentage);
    }, 50);
  }, [animate]);
  return (
    <div>
      <span className="text-md">{text}</span>
      <Progress value={animate} max={percentage}></Progress>
      <span className="text-sm text-muted-foreground">
        {percentage.toFixed(1)}% ({votes})
      </span>
    </div>
  );
}

export default ProgressAnimated;
