import { FolderBlockProps } from "@githubnext/blocks";
import { useQuery } from "@tanstack/react-query";
import { decode } from "js-base64";
import { File } from "..";

export type FileWithContent = File & {
  name: string;
  extension: string;
  content: string;
  columns: string[];
};

const dropExtension = (filename: string) => filename.replace(/\.[^/.]+$/, "");

export function useFilesContent(
  files: File[],
  context: FolderBlockProps["context"],
  fetcher: FolderBlockProps["onRequestGitHubData"]
) {
  return useQuery<any, unknown, FileWithContent[]>({
    queryKey: ["files", files.map((file) => file.path)],
    queryFn: async () => {
      const responses = await Promise.all(
        files.map((file) =>
          fetcher(
            `/repos/${context.owner}/${context.repo}/contents/${file.path}`
          )
        )
      );
      let content = responses
        .filter((file) => Boolean(file.content))
        .map((file) => {
          return {
            ...file,
            extension: file.name.split(".").pop(),
            name: dropExtension(file.name as string),
            content: decode(file.content),
            columns: [],
          };
        });

      // for (const file of content) {
      //   // @ts-ignore
      //   file["columns"] = await asyncParse(file.content);
      // }

      return content;
    },
  });
}
