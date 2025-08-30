import { BaseComponent } from '../core/Component';

export class InteractableComponent extends BaseComponent {
  selectable: boolean = true;
  draggable: boolean = true;
  resizable: boolean = true;
  rotatable: boolean = true;
  locked: boolean = false;
  selected: boolean = false;
  hovered: boolean = false;
  cursor: string = 'pointer';
  hoverTolerance: number = 0;

  constructor(options?: Partial<InteractableComponent>) {
    super();
    if (options) {
      Object.assign(this, options);
    }
  }

  static readonly(): InteractableComponent {
    return new InteractableComponent({
      selectable: false,
      draggable: false,
      resizable: false,
      rotatable: false,
      locked: true,
      cursor: 'default'
    });
  }

  static viewOnly(): InteractableComponent {
    return new InteractableComponent({
      selectable: true,
      draggable: false,
      resizable: false,
      rotatable: false,
      cursor: 'pointer'
    });
  }
}