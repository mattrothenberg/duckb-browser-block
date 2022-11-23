import { FolderBlockProps } from "@githubnext/blocks";
import { useQuery } from "@tanstack/react-query";
import { decode } from "js-base64";
import Papa from "papaparse";

const asyncParse = (content: string) => {
  return new Promise((resolve) => {
    Papa.parse(content, {
      complete: (results) => {
        // @ts-ignore
        resolve(results.data[0].filter(Boolean));
      },
    });
  });
};

type FilesContent = { name: string; content: string; columns: string[] }[];

export function useFilesContent(
  files: any[],
  context: FolderBlockProps["context"],
  fetcher: FolderBlockProps["onRequestGitHubData"]
) {
  return useQuery<any, unknown, FilesContent>({
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
            name: file.name as string,
            content: decode(file.content),
          };
        });

      for (const file of content) {
        // @ts-ignore
        file["columns"] = await asyncParse(file.content);
      }

      return content;
    },
  });
}
