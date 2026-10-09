import { ChangeDetectionStrategy, Component } from '@angular/core'

/**
 * A component whose template the HMR definition tests rewrite: it gains and
 * loses elements, bindings, attributes and <ng-content> slots.
 */
@Component({
  selector: 'app-lab',
  templateUrl: './lab.html',
  // A style block so every template update module also merges `styles`, the
  // key the swap otherwise leaves to the `...ɵcmp` spread.
  styles: ['.lab-one { font-weight: bold }'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Lab {
  a = 'LAB_A'
  b = 'LAB_B'
}
