import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import Papa from "papaparse";
import React, { useState, useEffect } from "react";
const { ipcRenderer } = window.require("electron");
const fs = window.require("fs");
const path = window.require("path");
const os = window.require("os");

// Define a type for the item
interface Item {
  id: number;
  name: string;
  description: string;
}

const App: React.FC = () => {
  // State for items, name, and description
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Fetch items on component mount
  useEffect(() => {
    fetchItems();
  }, []);

  // Function to fetch items from the database
  const fetchItems = async () => {
    const items: Item[] = await ipcRenderer.invoke("read-items");
    setItems(items);
  };

  // Function to add a new item to the database
  const addItem = async () => {
    if (name && description) {
      const newItem: Item = await ipcRenderer.invoke("create-item", {
        name,
        description,
      });
      setItems([...items, newItem]);
      setName("");
      setDescription("");
    }
  };

  // Function to update an existing item in the database
  const updateItem = async (id: number) => {
    if (name && description) {
      const updatedItem: Item = { id, name, description };
      await ipcRenderer.invoke("update-item", updatedItem);
      fetchItems();
    }
  };

  // Function to delete an item from the database
  const deleteItem = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this item")) return;
    await ipcRenderer.invoke("delete-item", id);
    fetchItems();
  };

  // Import CSV
  const importCSV = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvData = event.target?.result as string;
      Papa.parse(csvData, {
        header: true,
        complete: async (results) => {
          const importedItems = results.data as Item[];
          for (const item of importedItems) {
            await ipcRenderer.invoke("create-item", item);
          }
          fetchItems();
        },
      });
    };
    reader.readAsText(file);
  };

  // // Export CSV
  // const exportCSV = () => {
  //   const csv = Papa.unparse(items);
  //   const filePath = path.join(__dirname, "exported-data.csv");
  //   fs.writeFile(filePath, csv, (err: any) => {
  //     if (err) {
  //       console.log(err);
  //       console.error("Failed to save the file:", err);
  //     } else {
  //       console.log("File saved:", filePath);
  //     }
  //   });
  // };

  // const exportCSV = () => {
  //   const csv = Papa.unparse(items);

  //   // Get the user's home directory
  //   const homeDir = os.homedir();
  //   const filePath = path.join(homeDir, "exported-data.csv");

  //   // Save the CSV file to the user's home directory
  //   fs.writeFile(filePath, csv, (err: NodeJS.ErrnoException | null) => {
  //     if (err) {
  //       console.error("Failed to save the file:", err);
  //     } else {
  //       console.log("File saved:", filePath);
  //     }
  //   });
  // };

  const exportCSV = async () => {
    const csv = Papa.unparse(items);

    // Get the default path for saving
    const homeDir = os.homedir();
    const defaultPath = path.join(homeDir, "exported-data.csv");

    // Ask the user where to save the file
    const filePath = await ipcRenderer.invoke("save-dialog", defaultPath);

    if (filePath) {
      fs.writeFile(filePath, csv, (err: NodeJS.ErrnoException | null) => {
        if (err) {
          console.error("Failed to save the file:", err);
        } else {
          alert(`File saved at: ${filePath}`);
        }
      });
    } else {
      console.log("Save canceled");
    }
  };

  const exportPDF = async () => {
    // Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();

    // Embed the Helvetica font
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Add a page to the PDF
    const page = pdfDoc.addPage([600, 400]);
    const { width, height } = page.getSize();

    // Set the title and export date
    const title = "Exported Data Report";
    const date = new Date().toLocaleDateString();
    const titleFontSize = 20;
    const textFontSize = 12;

    // Draw the title and date
    page.drawText(title, {
      x: 50,
      y: height - 50,
      size: titleFontSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Date of Export: ${date}`, {
      x: 50,
      y: height - 70,
      size: textFontSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    // Draw the data table headers
    const headers = ["ID", "Name", "Description"];
    const headerYPosition = height - 100;

    headers.forEach((header, index) => {
      page.drawText(header, {
        x: 50 + index * 150,
        y: headerYPosition,
        size: textFontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    });

    // Draw the data rows
    let rowYPosition = headerYPosition - 20;
    items.forEach((item) => {
      const row = [item.id.toString(), item.name, item.description];
      row.forEach((cell, index) => {
        page.drawText(cell, {
          x: 50 + index * 150,
          y: rowYPosition,
          size: textFontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      });
      rowYPosition -= 20;
    });

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();

    // Ask the user where to save the PDF file
    const filePath = await ipcRenderer.invoke(
      "show-save-dialog-pdf",
      "exported-data.pdf"
    );

    if (filePath) {
      // Write the PDF file to disk
      fs.writeFile(filePath, pdfBytes, (err: NodeJS.ErrnoException | null) => {
        if (err) {
          console.error("Failed to save the file:", err);
        } else {
          alert(`PDF file saved at: ${filePath}`);
        }
      });
    } else {
      console.log("Save canceled");
    }
  };

  return (
    <div className="p-3">
      <h1 className="text-xl">CRUD with SQLite and Electron</h1>

      <div className="bg-blue-300 p-2 flex gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm m-0" htmlFor="name">
            Name
          </label>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="bg-blue-100 border border-blue-700 rounded p-1"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm m-0" htmlFor="name">
            Name
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="bg-blue-100 border border-blue-700 rounded p-1"
          />
        </div>

        <div>
          <button
            className="p-2 bg-blue-600 rounded px-3 text-white"
            onClick={addItem}
          >
            Add Item
          </button>
        </div>
      </div>

      <div>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files && importCSV(e.target.files[0])}
        />
        <button onClick={exportCSV}>Export to CSV</button>
        ------
        <button onClick={exportPDF}>Export to PDF</button>
      </div>

      <table className="w-full text-left border mt-4" border={1}>
        <thead>
          <tr>
            <th className="p-2 border">Id</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Description</th>
            <th className="p-2 border w-[100px]"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="p-2 border">{item.id}</td>
              <td className="p-2 border">{item.name}</td>
              <td className="p-2 border">{item.description}</td>
              <td className="p-2 border flex gap-2 w-fit">
                <button
                  className="p-2 text-sm bg-blue-200 text-blue-950"
                  onClick={() => updateItem(item.id)}
                >
                  Update
                </button>
                <button
                  className="p-2 text-sm bg-blue-200 text-blue-950"
                  onClick={() => deleteItem(item.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;

// import React from "react";

// function App() {
//   return (
//     <div className=" flex min-h-[100vh]">
//       <div className="w-[200px] bg-gray-800 text-white p-2">
//         <h2 className="text-4xl text-center p-1 bg-yellow-800 rounded">
//           CAMIS Desktop
//         </h2>

//         <div className="flex flex-col gap-2 pt-5">
//           {[
//             "School",
//             "Teachers",
//             "Students",
//             "Classes",
//             "Special courses",
//             "Report cards",
//           ].map((el) => (
//             <button
//               key={el}
//               className="p-2 rounded-lg bg-gray-700 text-white text-left"
//             >
//               {el}
//             </button>
//           ))}
//         </div>
//       </div>
//       <div className="flex-1 p-2">
//         <div>
//           <h2>Import marks</h2>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default App;
