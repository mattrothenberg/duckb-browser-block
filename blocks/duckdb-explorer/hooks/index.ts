import { FolderBlockProps } from "@githubnext/blocks";
import { useQuery } from "@tanstack/react-query";
import { decode } from "js-base64";
import { File } from "..";
import { parse, unparse } from "papaparse";

export type FileWithContent = File & {
  name: string;
  extension: string;
  content: string;
  columns: string[];
};

const dropExtension = (filename: string) => filename.replace(/\.[^/.]+$/, "");

const asyncParse = (content: string, extension: string) => {
  return new Promise((resolve) => {
    switch (extension) {
      case "csv":
        parse(content, {
          complete: (results) => {
            // @ts-ignore
            resolve(results.data[0].filter(Boolean));
          },
        });
      case "json":
        // Extremely naïve, make this less sucky.
        resolve(Object.keys(content[0]));
    }
  });
};

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

      let validResponses = responses.filter((file) => Boolean(file.content));

      let content = await Promise.all(
        validResponses.map(async (file) => {
          let extension = file.name.split(".").pop();
          let name = dropExtension(file.name as string);
          let content = decode(file.content);
          return {
            ...file,
            extension,
            name,
            content,
            columns: (await asyncParse(content, extension)) as string,
          };
        })
      );
      return content;
    },
  });
}
