export interface UserInterface {
  id: string;
  name: string;
  email: string;
  password?: string;
  dateCreated: Date;
  dateUpdated: Date;
}

//TODO: Use Zod to build this user interface & enforce validation rules
