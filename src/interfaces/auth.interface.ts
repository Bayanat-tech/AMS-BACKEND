export interface Child {
  serial_number: number;
  app_code: string;
}

export interface AppStructure {
  serial_number: number;
  app_code: string;
  children: { [key: string]: Child };
}

export interface StructuredResult {
  [key: string]: AppStructure;
}
