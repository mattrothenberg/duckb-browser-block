import { FolderBlockProps } from "@githubnext/blocks";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataBrowser } from "./components/data-browser";
import { Loader } from "./components/loader";

import { useFilesContent } from "./hooks";

function BlockInner({
  files,
  blockProps,
}: {
  files: any[];
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

export default function (props: FolderBlockProps) {
  const justCsvs = props.tree.filter((f) => f?.path?.endsWith(".csv"));

  return (
    <QueryClientProvider client={client}>
      <BlockInner blockProps={props} files={justCsvs} />
    </QueryClientProvider>
  );
}
