function PageLoader() {
  return (
    <div className="flex flex-col justify-center items-center">
      <div className="relative size-12 animate-spin988">
        <div className="absolute left-0 top-0 size-[1.2rem] rounded-full bg-[#65B82E]" />
        <div className="absolute right-0 top-0 size-[1.2rem] rounded-full bg-[#65B82E]" />
        <div className="absolute bottom-0 left-0 size-[1.2rem] rounded-full bg-[#65B82E]" />
        <div className="absolute bottom-0 right-0 size-[1.2rem] rounded-full bg-[#65B82E]" />
      </div>
      <p className="text-[#65B82E] mt-10 text-2xl font-semibold">LOADING...</p>
    </div>
  );
}

export default PageLoader;
