import { FolderBlockProps } from "@githubnext/blocks";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataBrowser } from "./components/data-browser";
import { Loader } from "./components/loader";

import { useFilesContent } from "./hooks";

function BlockInner({
  files,
  blockProps,
}: {
  files: File[];
  blockProps: FolderBlockProps;
}) {
  const { isLoading, isError, data } = useFilesContent(
    files,
    blockProps.context,
    blockProps.onRequestGitHubData
  );
  if (isLoading) {
    return <Loader />;
  }

  if (isError) {
    return <span>Error</span>;
  }

  return <DataBrowser files={data} />;
}

const client = new QueryClient();

const validExtensions = ["csv", "json"];

export type File = {
  path?: string | undefined;
  mode?: string | undefined;
  type?: string | undefined;
  sha?: string | undefined;
  size?: number | undefined;
  url?: string | undefined;
};

export default function (props: FolderBlockProps) {
  const validFiles = props.tree.filter(
    (f) => validExtensions.indexOf(f?.path?.split(".").pop() || "") > -1
  );

  return (
    <QueryClientProvider client={client}>
      <BlockInner blockProps={props} files={validFiles} />
    </QueryClientProvider>
  );
}
