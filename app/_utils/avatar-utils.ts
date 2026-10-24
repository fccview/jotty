export const initialsOf = (username: string) => {
  const words = username.split(" ").filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return username.substring(0, 2).toUpperCase();
};
