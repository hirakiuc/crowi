import React from 'react'
import { Button, Modal } from 'react-bootstrap'

import Icon from '../Common/Icon'
import User from '../User/User'

export default class DeleteAttachmentModal extends React.Component {
  constructor(props) {
    super(props)

    this._onDeleteConfirm = this._onDeleteConfirm.bind(this)
  }

  _onDeleteConfirm() {
    this.props.onAttachmentDeleteClickedConfirm(this.props.attachmentToDelete)
  }

  renderByFileFormat(attachment) {
    if (attachment.fileFormat.match(/image\/.+/i)) {
      return (
        <p className="attachment-delete-image">
          <span>
            {attachment.originalName} uploaded by <User user={attachment.creator} username />
          </span>
          <img src={attachment.url} />
        </p>
      )
    }

    return (
      <p className="attachment-delete-file">
        <Icon name="file-o" />
        <span>
          {attachment.originalName} uploaded by <User user={attachment.creator} username />
        </span>
      </p>
    )
  }

  render() {
    const attachment = this.props.attachmentToDelete
    if (attachment === null) {
      return null
    }

    const inUse = this.props.inUse

    const props = Object.assign({}, this.props)
    delete props.onAttachmentDeleteClickedConfirm
    delete props.attachmentToDelete
    delete props.inUse
    delete props.deleting
    delete props.deleteError

    let deletingIndicator = ''
    if (this.props.deleting) {
      deletingIndicator = <Icon name="spinner" spin />
    }
    if (this.props.deleteError) {
      deletingIndicator = <p>{this.props.deleteError}</p>
    }

    let renderAttachment = this.renderByFileFormat(attachment)

    return (
      <Modal {...props} className="attachment-delete-modal" bsSize="large" aria-labelledby="contained-modal-title-lg">
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-lg">Delete attachment?</Modal.Title>
        </Modal.Header>
        <Modal.Body>{renderAttachment}</Modal.Body>
        <Modal.Footer>
          {deletingIndicator}
          <Button onClick={this._onDeleteConfirm} bsStyle="danger" disabled={this.props.deleting}>
            Delete!
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }
}
