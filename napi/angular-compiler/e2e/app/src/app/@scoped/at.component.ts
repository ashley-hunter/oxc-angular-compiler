import { Component } from '@angular/core'

/** A component whose file path contains `@`, like one under `node_modules/@scope`. */
@Component({
  selector: 'app-at',
  templateUrl: './at.html',
})
export class At {
  value = 'AT_VALUE'
}
