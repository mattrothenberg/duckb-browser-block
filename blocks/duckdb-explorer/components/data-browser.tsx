import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { sql } from "@codemirror/lang-sql";
import CodeMirror from "@uiw/react-codemirror";
import { tw } from "twind";
import { Grid } from "@githubocto/flat-ui";

import * as duckdb from "@duckdb/duckdb-wasm";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdb_wasm_next from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import { Loader } from "./loader";
import { FileWithContent } from "../hooks";

const MANUAL_BUNDLES = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_next,
    // mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).toString(),
    mainWorker: eh_worker,
  },
};

// Select a bundle based on browser checks
const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
// @ts-ignore
const worker = new Worker(bundle.mainWorker);
const logger = new duckdb.ConsoleLogger();

export function DataBrowser({ files }: { files: FileWithContent[] }) {
  const [dbStatus, setDbStatus] = useState("idle");
  const [query, setQuery] = useState(`select * from ${files[0].name}`);
  const [debouncedQuery] = useDebounce(query, 250);
  const connRef = useRef<any>();
  const dbRef = useRef<any>();

  const execQuery = async (query: string) => {
    console.log("execQuery", query);
    if (!connRef.current) return;
    const queryRes = await connRef.current.query(query);
    const asArray = queryRes.toArray();

    return {
      numRows: queryRes.numRows,
      numCols: queryRes.numCols,
      results: asArray.map((row: any) => {
        return row.toJSON();
      }),
    };
  };

  const { isError, data, error } = useQuery({
    queryKey: ["query", debouncedQuery],
    queryFn: () => {
      return execQuery(debouncedQuery);
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled: debouncedQuery.length > 0 && dbStatus === "ready",
  });

  useEffect(() => {
    async function initDb() {
      try {
        const db = new duckdb.AsyncDuckDB(logger, worker);
        dbRef.current = db;
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        const conn = await db.connect(); // Connect to db
        connRef.current = conn;

        for (const file of files) {
          await db.registerFileText(file.name, file.content);

          switch (file.extension) {
            case "json":
              await conn.insertJSONFromPath(file.name, {
                name: file.name,
              });
              break;
            case "csv":
              await conn.insertCSVFromPath(file.name, {
                name: file.name,
              });
              break;
            default:
              break;
          }

          setDbStatus("ready");
        }
      } catch (e) {
        console.error(e);
        setDbStatus("error");
      }
    }

    initDb();

    return () => {
      if (connRef.current) {
        connRef.current.close();
      }

      if (dbRef.current) {
        dbRef.current.terminate();
      }
    };
  }, []);

  const schema = useMemo(() => {
    return files.reduce<Record<string, string[]>>((acc, file) => {
      acc[file.name] = file.columns.map((c) => c.toLowerCase());
      return acc;
    }, {});
  }, [files]);

  if (dbStatus !== "ready") {
    return <Loader />;
  }

  const handleInsert = (name: string) => {
    setQuery(`select * from ${name}`);
  };

  return (
    <div className={tw`divide-y flex flex-col overflow-hidden h-full`}>
      <div
        className={tw`bg-gray-100 p-3 text-xs font-mono border-b flex-shrink-0`}
      >
        <div className={tw`flex items-center space-x-2`}>
          Loaded tables are:{" "}
          <div className={tw`inline-flex ml-1 space-x-1`}>
            {files.map((f, index) => {
              const name = f.name;
              return (
                <button
                  className={tw`hover:underline`}
                  onClick={() => handleInsert(f.name)}
                >
                  <strong>{name}</strong>
                  {index === files.length - 1 ? "" : ", "}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className={tw`flex-shrink-0`}>
        <CodeMirror
          value={query}
          height={"120px"}
          className={tw`w-full font-mono`}
          extensions={[
            sql({
              schema,
            }),
          ]}
          onChange={(value) => {
            setQuery(value);
          }}
        />
      </div>

      <div className={tw`flex-1 overflow-auto`}>
        <>
          {isError && error && (
            <div
              className={tw`bg-red-50 border-b border-red-600 p-2 text-sm text-red-600`}
            >
              {(error as Error)?.message || "An unexpected error occurred."}
            </div>
          )}
          <Grid
            data={data?.results || []}
            diffData={undefined}
            defaultSort={undefined}
            defaultStickyColumnName={undefined}
            defaultFilters={{}}
            downloadFilename={""}
            onChange={() => {}}
          />
        </>
      </div>
    </div>
  );
}
