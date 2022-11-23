import { tw } from "twind";

export function Loader() {
  return (
    <div className={tw`h-full flex items-center justify-center`}>
      <p className={tw`text-gray-600 animate-pulse text-sm`}>Loading...</p>
    </div>
  );
}
