import { URL } from "url";

const isValidURL = (url: string, protocols?: string[]) => {
  try {
    const parsedURL = new URL(url);

    if (protocols?.length) {
      return protocols
        .map((p) => `${p.toLowerCase()}:`)
        .includes(parsedURL.protocol);
    } else {
      return true;
    }
  } catch {
    return false;
  }
};

export default isValidURL;
