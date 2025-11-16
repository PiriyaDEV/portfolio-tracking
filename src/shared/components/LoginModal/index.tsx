"use client";

import CommonLoading from "@/shared/components/CommonLoading";

type Props = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string;
  loginError: string | null;
  setUserId: (value: string) => void;
  handleLogin: () => void;
};

export default function LoginModal({
  isLoggedIn,
  isLoading,
  userId,
  loginError,
  setUserId,
  handleLogin,
}: Props) {
  // When logged in → hide
  if (isLoggedIn) return null;

  // Show loading overlay during login
  if (isLoading) return <CommonLoading />;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
      <div className="bg-black-lighter p-6 rounded-lg w-[300px] flex flex-col gap-4">
        <h2 className="text-white text-xl font-bold text-center">Login</h2>

        <input
          type="password"
          placeholder="Enter password"
          className="p-2 rounded bg-white !text-black border border-accent-yellow"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          disabled={isLoading}
        />

        {loginError && <p className="!text-red-500 text-sm">{loginError}</p>}

        <button
          className="bg-accent-yellow text-white p-2 rounded"
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Login"}
        </button>
      </div>
    </div>
  );
}
