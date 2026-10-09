import { Component, input, model, output } from '@angular/core'

/**
 * A component with every kind of output and an aliased, transformed input, for
 * checking that a template hot swap leaves them bound.
 */
@Component({
  selector: 'app-io',
  templateUrl: './io.html',
})
export class Io {
  clicked = output<string>()
  renamed = output<number>({ alias: 'renamedAlias' })
  checked = model(false)
  label = input('', { alias: 'labelAlias', transform: (value: string) => value.toUpperCase() })

  emit(): void {
    this.clicked.emit('CLICKED')
    this.renamed.emit(7)
    this.checked.set(!this.checked())
  }
}
