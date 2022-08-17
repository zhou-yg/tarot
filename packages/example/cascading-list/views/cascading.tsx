import { useTarat } from 'tarat-connect'
import React, { useEffect, useState } from 'react'
import PlusSquareOutlined from '@ant-design/icons/PlusSquareOutlined'
import FolderOutlined from '@ant-design/icons/FolderOutlined'
import SettingOutlined from '@ant-design/icons/SettingOutlined'
import EditOutlined from '@ant-design/icons/EditOutlined'
import cascadingHook from '../drivers/cascading'

const Files: React.FC<{}> = () => {
  const cascading = useTarat(cascadingHook)

  const hasItems = cascading.items().length > 0

  const ciid = cascading.currentItemId()

  const renameInput = cascading.renameItemInput()
  
  return (
    <div className="px-2 h-full">
      {!hasItems ? (
        <div className="h-full flex items-center justify-center">
          无记录
          <button
            onClick={() => {
              cascading.createItem()
            }}
            className="ml-2 block text-xs text-slate-600 px-2 border-x border-y">
            新建
          </button>
        </div>
      ) : (
        <>
          {cascading.items().map(item => {
            const current = item.id === ciid
            const cls = current ? 'bg-slate-100 text-black p-2' : 'mx-2 my-1'
            const settingCls = current ? '' : 'hidden group-hover:inline'
            
            return (
              <div key={item.id} onClick={e => {
                cascading.switchCurrentItem(item)
              }} className={`cursor-pointer group flex items-center ${cls}`}>
                
                {renameInput.id === item.id ? (
                  <input value={renameInput.name} onChange={e => {
                    cascading.renameItemInput(v => {
                      v.name = e.target.value
                    })
                  }} onBlur={() => cascading.renameItem()} className="flex-1 text-black p-2" />
                ) : (
                  <span className="mr-2 flex-1">{item.name}</span>
                )}

                <EditOutlined onClick={e => {
                  cascading.startItemRename(item)
                }} className={settingCls} />
              </div>
            )
          })}
          <button
            onClick={() => {
              cascading.createItem()
            }}
            className="flex items-center text-xs text-slate-600 px-2">
            <PlusSquareOutlined /> <span className='ml-1'>新建文件</span>
          </button>
        </>
      )}
    </div>
  )
}

const Cascading: React.FC<{
  title?: string
}> = (props) => {
  const { title = '我的文件夹' } = props

  const cascading = useTarat(cascadingHook)

  const cfid = cascading.currentFolderId()

  const [rename, setRename] = useState<{ id: number, name: string }>()

  useEffect(() => {
    // function fn () {
    //   cascading.currentFolderId(() => null)
    // }
    // document.addEventListener('click', fn)
    return () => {
      // document.removeEventListener('click', fn)
    }
  }, [])

  const renameInput = cascading.renameFolderInput()
  
  console.log('renameInput: ', renameInput);

  return (
    <div className="p-2  text-black flex">
      <div className="p-2 bg-slate-200 flex-1">
        <header className="text-sm">
          {title}
        </header>
        <div className="my-2">
          <ul>
            {cascading.folders().map(folder => {
              const current = folder.id === cfid
              const cls = current ? 'bg-black text-white p-2' : 'mx-2 my-1'
              const settingCls = current ? '' : 'hidden group-hover:inline'
              console.log('folder.id: ', folder.id)
              return (
                <li key={folder.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    cascading.switchCurrentFolder(folder)
                  }}
                  className={`group cursor-pointer flex items-center ${cls}`} >
                    <FolderOutlined /> 
                    
                    {folder.id === renameInput.id ? (
                      <input value={renameInput.name} onChange={e => {
                        cascading.renameFolderInput(v => {
                          v.name = e.target.value
                        })
                      }} onBlur={() => cascading.renameFolder()} className="ml-1 flex-1 mr-2 text-black p-2" />
                    ) : (
                      <span className='ml-1 flex-1 mr-2'>{folder.name}</span>
                    )}

                    <SettingOutlined onClick={(e) => {
                      e.stopPropagation()
                      cascading.startRename(folder)
                    }} className={settingCls} />
                </li>
              )
            })}
          </ul>
        </div>
        <button
          onClick={() => {
            cascading.createFolder()
          }}
          className="ml-2 flex items-center text-sm text-slate-600">
          <PlusSquareOutlined /> <span className='ml-1'>新建文件夹</span>
        </button>
      </div>
      <div className="flex-1">
        {cascading.currentFolderId() ? <Files /> : ''}
      </div>
    </div>
  )
}

export default Cascading