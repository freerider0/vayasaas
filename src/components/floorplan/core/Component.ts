export type Component = {
  id: string;
  enabled: boolean;
}

export abstract class BaseComponent implements Component {
  id: string;
  enabled: boolean = true;

  constructor() {
    this.id = crypto.randomUUID();
  }
}